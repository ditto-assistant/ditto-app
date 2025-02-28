import { useCallback, useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import ReactMarkdown from "react-markdown";
import { FaTable, FaProjectDiagram, FaTimes, FaTrash } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { IoMdArrowDropdown } from "react-icons/io";
import { FiCopy } from "react-icons/fi";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { useImageViewerHandler } from "@/hooks/useImageViewerHandler";
import { useMemoryDeletion } from "@/hooks/useMemoryDeletion";

const formatDateTime = (timestamp) => {
  if (!timestamp) return "";
  if (timestamp?.toDate) {
    timestamp = timestamp.toDate();
  } else if (typeof timestamp === "string") {
    timestamp = new Date(timestamp);
  } else if (typeof timestamp === "number") {
    timestamp = new Date(timestamp);
  }
  if (!(timestamp instanceof Date) || isNaN(timestamp)) {
    return "";
  }

  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return new Intl.DateTimeFormat("default", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: browserTimezone,
  }).format(timestamp);
};

// Update the TableView component
const TableView = ({ memories, updateConversation }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const { handleImageClick } = useImageViewerHandler(false);
  const { confirmMemoryDeletion } = useMemoryDeletion(updateConversation);

  const handleDelete = async (memory) => {
    const docId = memory.id || memory.pairID;
    if (docId) {
      confirmMemoryDeletion(docId, {
        onSuccess: () => {
          window.dispatchEvent(new Event("memoryUpdated"));
        },
      });
    }
  };

  const toggleExpanded = (nodeId) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Recursive component to render memory nodes
  const MemoryNode = ({ memory, depth = 0, index = 0, parentPath = "" }) => {
    const isExpanded = expandedNodes.has(memory.id);
    const hasChildren = memory.children && memory.children.length > 0;
    const indentStyle = { marginLeft: `${depth * 20}px` };
    const currentPath = parentPath
      ? `${parentPath}.${index + 1}`
      : `${index + 1}`;

    // Color palette for different depths
    const colors = [
      "#FF5733", // Root (orange-red)
      "#3498DB", // Level 1 (blue)
      "#2ECC71", // Level 2 (green)
      "#9B59B6", // Level 3 (purple)
      "#F1C40F", // Level 4 (yellow)
      "#E74C3C", // Level 5 (red)
      "#1ABC9C", // Level 6 (turquoise)
      "#D35400", // Level 7 (dark orange)
      "#8E44AD", // Level 8 (dark purple)
      "#27AE60", // Level 9 (dark green)
    ];

    // Get color based on depth, cycling through colors if depth exceeds array length
    const nodeColor =
      depth === 0 ? colors[0] : colors[(depth % (colors.length - 1)) + 1];

    return (
      <div
        style={{
          ...styles.memoryCard,
          ...indentStyle,
          borderLeft: depth > 0 ? `3px solid ${nodeColor}` : undefined,
        }}
      >
        <div style={styles.memoryHeader}>
          <div style={styles.memoryHeaderContent}>
            <div style={styles.memoryHeaderLeft}>
              {hasChildren && (
                <button
                  onClick={() => toggleExpanded(memory.id)}
                  style={styles.expandButton}
                >
                  <IoMdArrowDropdown
                    style={{
                      ...styles.expandIcon,
                      transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                      transition: "transform 0.2s ease",
                      color: nodeColor,
                    }}
                  />
                </button>
              )}
              <div style={{ ...styles.memoryLabel, color: nodeColor }}>
                {depth === 0 ? "Your Prompt" : `Memory ${currentPath}`}
              </div>
            </div>
            <div style={styles.timestamp}>
              {formatDateTime(memory.timestampString || memory.timestamp)}
            </div>
          </div>
          <div style={styles.memoryActions}>
            <button
              onClick={() => handleDelete(memory)}
              style={{
                ...styles.deleteButton,
                "&:hover": {
                  backgroundColor: `${nodeColor}22`,
                },
              }}
            >
              <FaTrash />
            </button>
          </div>
        </div>
        {renderMarkdown(memory.prompt)}
        {memory.response !== memory.prompt && renderMarkdown(memory.response)}

        {hasChildren && isExpanded && (
          <div style={styles.childrenContainer}>
            {memory.children.map((child, idx) => (
              <MemoryNode
                key={child.id}
                memory={child}
                depth={depth + 1}
                index={idx}
                parentPath={currentPath}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMarkdown = (content) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        ol: ({ ...props }) => (
          <ol
            {...props}
            style={{ ...styles.chatBubbleList, ...styles.orderedList }}
          />
        ),
        ul: ({ ...props }) => (
          <ul
            {...props}
            style={{ ...styles.chatBubbleList, ...styles.unorderedList }}
          />
        ),
        li: ({ ...props }) => (
          <li {...props} style={styles.chatBubbleListItem} />
        ),
        p: ({ ...props }) => <p {...props} style={{ margin: "0.5em 0" }} />,
        code({ inline, className, children, ...props }) {
          let match = /language-(\w+)/.exec(className || "");
          let hasCodeBlock;
          if (content.match(/```/g)) {
            hasCodeBlock = content.match(/```/g).length % 2 === 0;
          }
          if (!match && hasCodeBlock) {
            match = ["language-txt", "txt"];
          }
          if (!inline && match) {
            return (
              <div className="code-container">
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                  className="code-block"
                >
                  {children}
                </SyntaxHighlighter>
                <button
                  className="copy-button code-block-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(
                      String(children).replace(/\n$/, "")
                    );
                    toast.success("Copied!");
                  }}
                  title="Copy code"
                >
                  <FiCopy />
                </button>
              </div>
            );
          } else {
            const inlineText = String(children).replace(/\n$/, "");
            return (
              <span className="inline-code-container">
                <code className="inline-code" {...props}>
                  {children}
                </code>
                <button
                  className="copy-button inline-code-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(inlineText);
                    toast.success("Copied!");
                  }}
                  title="Copy code"
                >
                  <FiCopy />
                </button>
              </span>
            );
          }
        },
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt}
            style={styles.image}
            onClick={() => handleImageClick(src)}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <div style={styles.tableContainer}>
      {memories.map((memory) => (
        <MemoryNode key={memory.id} memory={memory} />
      ))}
    </div>
  );
};

// Update the MemoryNodeOverlay component
const MemoryNodeOverlay = ({ node, onClose, onDelete, updateConversation }) => {
  const { handleImageClick } = useImageViewerHandler(false);
  const { confirmMemoryDeletion } = useMemoryDeletion(updateConversation);

  const handleDelete = useCallback(() => {
    confirmMemoryDeletion(node.id, {
      onSuccess: () => {
        onDelete(node.id);
        onClose();
      },
    });
  }, [node.id, onDelete, onClose, confirmMemoryDeletion]);

  // Define renderMarkdown within the scope of MemoryNodeOverlay
  const renderMarkdown = useCallback(
    (content) => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          ol: ({ ...props }) => (
            <ol
              {...props}
              style={{ ...styles.chatBubbleList, ...styles.orderedList }}
            />
          ),
          ul: ({ ...props }) => (
            <ul
              {...props}
              style={{ ...styles.chatBubbleList, ...styles.unorderedList }}
            />
          ),
          li: ({ ...props }) => (
            <li {...props} style={styles.chatBubbleListItem} />
          ),
          p: ({ ...props }) => <p {...props} style={{ margin: "0.5em 0" }} />,
          code({ inline, className, children, ...props }) {
            let match = /language-(\w+)/.exec(className || "");
            let hasCodeBlock;
            if (content.match(/```/g)) {
              hasCodeBlock = content.match(/```/g).length % 2 === 0;
            }
            if (!match && hasCodeBlock) {
              match = ["language-txt", "txt"];
            }
            if (!inline && match) {
              return (
                <div className="code-container">
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                    className="code-block"
                  >
                    {children}
                  </SyntaxHighlighter>
                  <button
                    className="copy-button code-block-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(
                        String(children).replace(/\n$/, "")
                      );
                      toast.success("Copied!");
                    }}
                    title="Copy code"
                  >
                    <FiCopy />
                  </button>
                </div>
              );
            } else {
              const inlineText = String(children).replace(/\n$/, "");
              return (
                <span className="inline-code-container">
                  <code className="inline-code" {...props}>
                    {children}
                  </code>
                  <button
                    className="copy-button inline-code-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(inlineText);
                      toast.success("Copied!");
                    }}
                    title="Copy code"
                  >
                    <FiCopy />
                  </button>
                </span>
              );
            }
          },
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              style={styles.image}
              onClick={() => handleImageClick(src)}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    ),
    [handleImageClick]
  );

  // Add a check to see if this is the root node
  const isRootNode = !node.response || node.response === node.prompt;

  return (
    <AnimatePresence>
      <motion.div
        className="memory-node-overlay"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={styles.memoryNodeOverlay}
      >
        <motion.div
          className="memory-node-content"
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={styles.memoryNodeContent}
        >
          <div style={styles.nodeHeader}>
            <h3 style={styles.nodeTitle}>
              {isRootNode ? "Your Prompt" : "Memory"}
            </h3>
            <button onClick={onClose} style={styles.closeButton}>
              <FaTimes />
            </button>
          </div>
          <div style={styles.nodeBody}>
            <div style={styles.messageContainer}>
              <div style={styles.userMessage}>
                {renderMarkdown(node.prompt)}
              </div>
              {/* Only show divider and response if this isn't the root node */}
              {!isRootNode && (
                <>
                  <div style={styles.messagesDivider} />
                  <div style={styles.dittoMessage}>
                    {renderMarkdown(node.response)}
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={styles.nodeFooter}>
            <button onClick={handleDelete} style={styles.deleteButton}>
              <FaTrash /> Delete
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Update the MemoryNetwork component
const MemoryNetwork = ({ memories = [], onClose, updateConversation }) => {
  const [viewMode, setViewMode] = useState("table");
  const [nodesData, setNodesData] = useState(memories);
  const [selectedNode, setSelectedNode] = useState(null);
  const networkRef = useRef(null);
  const containerRef = useRef(null);
  const nodeIdMapRef = useRef({});

  const handleNodeClick = useCallback(
    (nodeId) => {
      const data = nodeIdMapRef.current[nodeId];
      if (data) {
        setSelectedNode(data);
      }
    },
    [nodeIdMapRef]
  );

  useEffect(() => {
    const buildNetwork = (nodesData) => {
      if (!containerRef.current) return;
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }

      const nodes = new DataSet();
      const edges = new DataSet();
      let nodeId = 1;
      const nodeIdMap = {};

      // Helper function to recursively add nodes and edges
      const addMemoryNodes = (
        memory,
        parentNodeId = null,
        depth = 0,
        parentPath = ""
      ) => {
        const currentNodeId = nodeId++;
        const currentPath = parentPath
          ? `${parentPath}.${nodeId}`
          : `${nodeId}`;
        const label = parentNodeId === null ? "Your Prompt" : currentPath;

        // Color palette for different depths
        const colors = [
          "#FF5733", // Root (orange-red)
          "#3498DB", // Level 1 (blue)
          "#2ECC71", // Level 2 (green)
          "#9B59B6", // Level 3 (purple)
          "#F1C40F", // Level 4 (yellow)
          "#E74C3C", // Level 5 (red)
          "#1ABC9C", // Level 6 (turquoise)
          "#D35400", // Level 7 (dark orange)
          "#8E44AD", // Level 8 (dark purple)
          "#27AE60", // Level 9 (dark green)
        ];

        // Get color based on depth, cycling through colors if depth exceeds array length
        const nodeColor =
          depth === 0 ? colors[0] : colors[(depth % (colors.length - 1)) + 1];

        nodes.add({
          id: currentNodeId,
          label: label,
          title: memory.prompt,
          color: nodeColor,
          size: Math.max(30 - depth * 3, 15), // Adjusted size reduction
          font: {
            size: Math.max(16 - depth * 1, 12), // Adjusted font size reduction
            color: "#ffffff",
          },
        });

        nodeIdMap[currentNodeId] = {
          prompt: memory.prompt,
          response: memory.response || "",
          timestamp: memory.timestampString || memory.timestamp,
          id: memory.id,
          path: currentPath,
        };

        if (parentNodeId !== null) {
          edges.add({
            from: parentNodeId,
            to: currentNodeId,
            length: Math.max(200 - depth * 20, 80), // Adjusted length reduction
            color: {
              color: nodeColor,
              opacity: 0.4,
            },
          });
        }

        // Recursively add child nodes
        if (memory.children && memory.children.length > 0) {
          memory.children.forEach((childMemory) => {
            addMemoryNodes(childMemory, currentNodeId, depth + 1, currentPath);
          });
        }

        return currentNodeId;
      };

      // Start building the network from the root node
      addMemoryNodes(nodesData[0]);

      // Store the nodeIdMap in the ref
      nodeIdMapRef.current = nodeIdMap;

      const options = {
        nodes: {
          shape: "dot",
          font: {
            color: "#ffffff",
            face: "Arial",
          },
          borderWidth: 2,
          shadow: true,
        },
        edges: {
          color: { color: "#ffffff", opacity: 0.3 },
          width: 2,
          smooth: {
            type: "continuous",
          },
          arrows: {
            to: { enabled: true, scaleFactor: 0.5 },
          },
        },
        physics: {
          enabled: true,
          barnesHut: {
            gravitationalConstant: -3000,
            centralGravity: 0.3,
            springLength: 200,
            springConstant: 0.04,
            damping: 0.09,
            avoidOverlap: 0.1,
          },
          stabilization: {
            enabled: true,
            iterations: 1000,
            updateInterval: 100,
          },
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          multiselect: false,
          dragView: true,
          zoomView: true,
          selectConnectedEdges: false,
          hoverConnectedEdges: true,
        },
      };

      // If network already exists, destroy it before creating a new one
      if (networkRef.current) {
        networkRef.current.destroy();
      }

      networkRef.current = new Network(
        containerRef.current,
        { nodes, edges },
        options
      );

      networkRef.current.on("click", (params) => {
        if (params.nodes.length > 0) {
          handleNodeClick(params.nodes[0]);
        }
      });

      return () => {
        networkRef.current.destroy();
      };
    };

    if (viewMode === "tree") {
      // Small delay to ensure container is ready
      setTimeout(() => {
        buildNetwork(nodesData);
      }, 0);
    }
  }, [viewMode, nodesData, handleNodeClick]);

  const handleMemoryDeleted = useCallback(
    (deletedId) => {
      const removeMemoryById = (nodes, id) => {
        const newNodes = JSON.parse(JSON.stringify(nodes)); // Deep copy
        const removeHelper = (memories) => {
          return memories.filter((memory) => {
            if (memory.id === id) {
              return false;
            }
            if (memory.children) {
              memory.children = removeHelper(memory.children);
            }
            return true;
          });
        };
        newNodes[0].children = removeHelper(newNodes[0].children || []);
        return newNodes;
      };

      // Remove the deleted memory from the nodes data
      const updatedNodes = removeMemoryById(nodesData, deletedId);
      setNodesData(updatedNodes);
    },
    [nodesData]
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Related Memories</h3>
        <div style={styles.viewControls}>
          <button
            onClick={() => setViewMode("tree")}
            style={{
              ...styles.viewButton,
              backgroundColor: viewMode === "tree" ? "#4752c4" : "transparent",
            }}
            title="Tree View"
          >
            <FaProjectDiagram />
          </button>
          <button
            onClick={() => setViewMode("table")}
            style={{
              ...styles.viewButton,
              backgroundColor: viewMode === "table" ? "#4752c4" : "transparent",
            }}
            title="Table View"
          >
            <FaTable />
          </button>
        </div>
        <button onClick={onClose} style={styles.closeButton}>
          <FaTimes />
        </button>
      </div>

      <div style={styles.content}>
        {viewMode === "tree" ? (
          <div ref={containerRef} style={styles.network} />
        ) : (
          <TableView
            memories={memories}
            updateConversation={updateConversation}
          />
        )}
      </div>

      {selectedNode && (
        <MemoryNodeOverlay
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          updateConversation={updateConversation}
          onDelete={handleMemoryDeleted}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100vh",
    backgroundColor: "#2f3136",
  },
  network: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2f3136",
    flex: 1,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    backgroundColor: "#2f3136",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    zIndex: 1,
  },
  title: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.2em",
    fontWeight: 600,
  },
  viewControls: {
    display: "flex",
    gap: "8px",
  },
  viewButton: {
    background: "transparent",
    border: "none",
    color: "#ffffff",
    padding: "8px",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  content: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  pathOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5000,
    backdropFilter: "blur(5px)",
    padding: "20px",
  },
  pathContent: {
    backgroundColor: "#36393f",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "800px",
    height: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  pathHeader: {
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pathTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.2em",
    fontWeight: 600,
  },
  pathBody: {
    padding: "24px",
    overflowY: "auto",
    flex: 1,
    paddingBottom: "80px",
  },
  pathNode: {
    marginBottom: "24px",
  },
  pathNodeContent: {
    backgroundColor: "transparent",
    marginTop: "12px",
    "& > * + *": {
      marginTop: "12px",
    },
  },
  pathNodePrompt: {
    color: "#ffffff",
    marginBottom: "12px",
  },
  pathNodeResponse: {
    color: "#ffffff",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    paddingTop: "12px",
    marginTop: "12px",
  },
  pathNodeChildHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  pathNodeChildTitle: {
    color: "#72767d",
    fontSize: "14px",
    fontWeight: "500",
  },
  pathNodeChildContent: {
    color: "#ffffff",
  },
  // New Table View styles
  promptSection: {
    backgroundColor: "#36393f",
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  promptLabel: {
    color: "#72767d",
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "8px",
  },
  promptContent: {
    color: "#ffffff",
    fontSize: "16px",
    lineHeight: "1.4",
  },
  memoriesList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    paddingBottom: "100px",
  },
  memoryCard: {
    backgroundColor: "#36393f",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    marginBottom: "16px",
    transition: "all 0.2s ease",
  },
  memoryContent: {
    maxHeight: "calc(100vh - 200px)",
    overflowY: "auto",
  },
  memoryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  memoryLabel: {
    color: "#72767d",
    fontSize: "14px",
    fontWeight: 600,
  },
  viewRelatedButton: {
    backgroundColor: "#4752c4",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    padding: "6px 12px",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginRight: "8px",
    "&:hover": {
      backgroundColor: "#3941b8",
    },
  },
  memoryPrompt: {
    color: "#ffffff",
    fontSize: "14px",
    marginBottom: "8px",
  },
  memoryResponse: {
    color: "#b9bbbe",
    fontSize: "14px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    paddingTop: "8px",
  },
  relatedOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5000,
    backdropFilter: "blur(5px)",
  },
  relatedContent: {
    backgroundColor: "#36393f",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "800px",
    maxHeight: "90vh",
    overflow: "hidden",
  },
  relatedHeader: {
    padding: "16px 24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  relatedTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.2em",
    fontWeight: 600,
  },
  relatedBody: {
    padding: "24px",
    overflowY: "auto",
    maxHeight: "calc(90vh - 80px)",
    paddingBottom: "80px",
  },
  parentMemory: {
    marginBottom: "24px",
  },
  parentLabel: {
    color: "#72767d",
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "8px",
  },
  parentContent: {
    backgroundColor: "#2f3136",
    padding: "16px",
    borderRadius: "8px",
  },
  parentPrompt: {
    color: "#ffffff",
    fontSize: "14px",
    marginBottom: "12px",
  },
  parentResponse: {
    color: "#b9bbbe",
    fontSize: "14px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    paddingTop: "12px",
  },
  relatedList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "16px",
  },
  relatedItem: {
    backgroundColor: "#2f3136",
    padding: "16px",
    borderRadius: "8px",
  },
  relatedLabel: {
    color: "#72767d",
    fontSize: "12px",
    fontWeight: 600,
    marginBottom: "8px",
  },
  relatedPrompt: {
    color: "#ffffff",
    fontSize: "14px",
    marginBottom: "8px",
  },
  relatedResponse: {
    color: "#b9bbbe",
    fontSize: "14px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    paddingTop: "8px",
  },
  image: {
    maxWidth: "100%",
    maxHeight: "300px",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "transform 0.2s ease",
    "&:hover": {
      transform: "scale(1.02)",
    },
  },
  tableContainer: {
    height: "100%",
    overflowY: "auto",
    padding: "20px",
    paddingBottom: "120px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  pathNodeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
  },
  pathNodeTitle: {
    color: "#72767d",
    fontSize: "14px",
    fontWeight: 500,
    marginBottom: "4px",
  },
  codeContainer: {
    position: "relative",
    margin: "12px 0",
  },

  codeBlock: {
    borderRadius: "8px",
    margin: "8px 0",
    padding: "12px",
    background: "#282c34",
    fontSize: "0.9em",
  },

  inlineCodeContainer: {
    display: "inline-flex",
    alignItems: "center",
    position: "relative",
    background: "#282c34",
    borderRadius: "6px",
    padding: "2px 6px",
    margin: "0 2px",
  },

  inlineCode: {
    color: "#ffffff",
    fontFamily: "Courier New, Courier, monospace",
    fontSize: "0.9em",
  },

  copyButton: {
    position: "absolute",
    top: "8px",
    right: "8px",
    background: "rgba(71, 82, 196, 0.9)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    opacity: 0,
  },

  copyButtonVisible: {
    opacity: 1,
  },

  memoryHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  pathNodeLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  pathNodeChildLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  promptHeader: {
    marginBottom: "12px",
  },

  memoryHeaderContent: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  timestamp: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: "0.8em",
    fontFamily: "monospace",
    whiteSpace: "nowrap",
  },

  expandButton: {
    background: "none",
    border: "none",
    color: "#ffffff",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  },

  expandIcon: {
    fontSize: "24px",
    color: "#ffffff",
    transition: "transform 0.2s ease",
  },

  relatedButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "#4752c4",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginRight: "8px",
    "&:hover": {
      backgroundColor: "#3941b8",
      transform: "translateY(-1px)",
    },
    "&:active": {
      transform: "translateY(0px)",
    },
  },

  relatedButtonText: {
    display: "inline-block",
    minWidth: "80px", // Ensures consistent width when text changes
    textAlign: "left",
  },

  relatedButtonIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
  },

  memoryActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  // Update deleteButton
  deleteButton: {
    background: "none",
    border: "none",
    color: "#ff4444",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "rgba(255, 68, 68, 0.1)",
      transform: "translateY(-1px)",
    },
    "&:active": {
      transform: "translateY(0px)",
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
      transform: "none",
    },
  },

  pathNodeChild: {
    marginTop: "16px",
    padding: "12px",
    backgroundColor: "#40444b",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    transition: "all 0.2s ease",
  },

  messageContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  userMessage: {
    backgroundColor: "#2f3136",
    borderRadius: "12px",
    padding: "12px",
    color: "#ffffff",
  },

  dittoMessage: {
    backgroundColor: "#2f3136",
    borderRadius: "12px",
    padding: "12px",
    color: "#ffffff",
  },

  messagesDivider: {
    height: "1px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    margin: "4px 0",
  },

  memoryNodeOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5000,
    backdropFilter: "blur(5px)",
    padding: "20px",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  memoryNodeContent: {
    backgroundColor: "#36393f",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "80vh",
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    padding: "24px",
    boxSizing: "border-box",
    margin: "0 auto",
  },
  nodeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  nodeTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.2em",
    fontWeight: 600,
  },
  closeButton: {
    background: "none",
    border: "none",
    color: "#ffffff",
    fontSize: "24px",
    cursor: "pointer",
    padding: "0 8px",
    transition: "opacity 0.2s",
  },
  nodeBody: {
    flex: 1,
    overflowY: "auto",
  },
  nodePrompt: {
    color: "#ffffff",
    marginBottom: "16px",
  },
  nodeResponse: {
    color: "#ffffff",
  },
  nodeFooter: {
    marginTop: "16px",
    display: "flex",
    justifyContent: "flex-end",
  },
  // Update list styles to use proper CSS-in-JS format
  chatBubbleList: {
    paddingLeft: "2em",
    margin: "0.8em 0",
    listStylePosition: "outside",
    whiteSpace: "normal",
    color: "#ffffff",
    fontSize: "14px",
    lineHeight: "1.4",
  },

  chatBubbleListItem: {
    margin: "0.4em 0",
    lineHeight: "1.4",
    display: "list-item",
    textAlign: "left",
    whiteSpace: "normal",
    color: "#ffffff",
  },

  orderedList: {
    listStyleType: "decimal",
  },

  unorderedList: {
    listStyleType: "disc",
  },

  nestedList: {
    margin: "0.4em 0",
  },

  nestedListItem: {
    margin: "0.2em 0",
  },

  childrenContainer: {
    marginTop: "16px",
    marginLeft: "16px",
    borderLeft: "2px solid rgba(255, 255, 255, 0.1)",
    paddingLeft: "16px",
  },
};

export default MemoryNetwork;
