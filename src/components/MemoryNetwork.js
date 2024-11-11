import React, { useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import ReactMarkdown from "react-markdown";
import { FaTable, FaProjectDiagram, FaTimes, FaTrash } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { IoMdArrowBack } from "react-icons/io";
import { FiDownload, FiCopy } from "react-icons/fi";
import { auth } from "../control/firebase";
import { deleteConversation } from "../control/memory";

// Update the formatDateTime function to handle both Firestore timestamps and regular dates
const formatDateTime = (timestamp) => {
  if (!timestamp) return "";

  // Handle Firestore timestamp
  if (timestamp?.toDate) {
    timestamp = timestamp.toDate();
  } else if (typeof timestamp === "string") {
    // Handle ISO string
    timestamp = new Date(timestamp);
  } else if (typeof timestamp === "number") {
    // Handle milliseconds timestamp
    timestamp = new Date(timestamp);
  }

  // Validate the date
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
const TableView = ({ memories, onMemoryClick }) => {
  const [selectedParent, setSelectedParent] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deletingMemories, setDeletingMemories] = useState(new Set());
  const [imageOverlay, setImageOverlay] = useState(null);
  const [imageControlsVisible, setImageControlsVisible] = useState(true);

  const handleDelete = async (memory) => {
    setDeleteConfirmation({
      memory,
      docId: memory.id || memory.pairID,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    const { memory, docId } = deleteConfirmation;
    const userID = auth.currentUser.uid;

    try {
      setDeletingMemories((prev) => new Set([...prev, docId]));
      await new Promise((resolve) => setTimeout(resolve, 300));

      const success = await deleteConversation(userID, docId);

      if (success) {
        // Dispatch memoryUpdated event to trigger memory count refresh
        window.dispatchEvent(new Event("memoryUpdated"));

        // Close any open overlays
        setSelectedParent(null);
        setDeleteConfirmation(null);
      }
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setDeletingMemories((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
      setDeleteConfirmation(null);
    }
  };

  const handleImageClick = (src) => {
    setImageOverlay(src);
  };

  const handleImageDownload = (src) => {
    window.open(src, "_blank");
  };

  const closeImageOverlay = () => {
    setImageOverlay(null);
  };

  const toggleImageControls = (e) => {
    e.stopPropagation();
    setImageControlsVisible(!imageControlsVisible);
  };

  const renderMarkdown = (content) => (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }) {
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
                  children={String(children).replace(/\n$/, "")}
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                  className="code-block"
                />
                <button
                  className="copy-button code-block-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(
                      String(children).replace(/\n$/, ""),
                    );
                    const toast = document.createElement("div");
                    toast.className = "copied-notification";
                    toast.textContent = "Copied!";
                    document.body.appendChild(toast);
                    setTimeout(() => {
                      toast.remove();
                    }, 2000);
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
              <div className="inline-code-container">
                <code className="inline-code" {...props}>
                  {children}
                </code>
                <button
                  className="copy-button inline-code-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(inlineText);
                    const toast = document.createElement("div");
                    toast.className = "copied-notification";
                    toast.textContent = "Copied!";
                    document.body.appendChild(toast);
                    setTimeout(() => {
                      toast.remove();
                    }, 2000);
                  }}
                  title="Copy code"
                >
                  <FiCopy />
                </button>
              </div>
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
      <div style={styles.promptSection}>
        <div style={styles.promptHeader}>
          <div style={styles.promptLabel}>Your Prompt</div>
          <div style={styles.timestamp}>
            {formatDateTime(
              memories[0]?.timestampString || memories[0]?.timestamp,
            )}
          </div>
        </div>
        {renderMarkdown(memories[0]?.prompt)}
      </div>

      <div style={styles.memoriesList}>
        {memories[0]?.related?.map((memory, index) => (
          <div key={memory.id} style={styles.memoryCard}>
            <div style={styles.memoryHeader}>
              <div style={styles.memoryHeaderContent}>
                <div style={styles.memoryLabel}>Memory {index + 1}</div>
                <div style={styles.timestamp}>
                  {formatDateTime(memory.timestampString || memory.timestamp)}
                </div>
              </div>
              <div style={styles.memoryActions}>
                <button
                  onClick={() => setSelectedParent(memory)}
                  style={styles.viewRelatedButton}
                >
                  View Related
                </button>
                <button
                  onClick={() => handleDelete(memory)}
                  style={styles.deleteButton}
                  disabled={deletingMemories.has(memory.id)}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
            {renderMarkdown(memory.prompt)}
            {renderMarkdown(memory.response)}
          </div>
        ))}
      </div>

      {/* Related Memories Overlay */}
      <AnimatePresence>
        {selectedParent && (
          <motion.div
            style={styles.relatedOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedParent(null)}
          >
            <motion.div
              style={styles.relatedContent}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.relatedHeader}>
                <h3 style={styles.relatedTitle}>Related Memories</h3>
                <button
                  onClick={() => setSelectedParent(null)}
                  style={styles.closeButton}
                >
                  <FaTimes />
                </button>
              </div>
              <div style={styles.relatedBody}>
                <div style={styles.parentMemory}>
                  <div style={styles.parentLabel}>Parent Memory</div>
                  <div style={styles.memoryActions}>
                    <button
                      onClick={() => handleDelete(selectedParent)}
                      style={styles.deleteButton}
                      disabled={deletingMemories.has(selectedParent.id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                  {renderMarkdown(selectedParent.prompt)}
                  {renderMarkdown(selectedParent.response)}
                </div>
                <div style={styles.relatedList}>
                  {selectedParent.related?.map((related, idx) => (
                    <div key={idx} style={styles.relatedItem}>
                      <div style={styles.relatedHeader}>
                        <div style={styles.relatedLabel}>
                          Related Memory {idx + 1}
                        </div>
                        <button
                          onClick={() => handleDelete(related)}
                          style={styles.deleteButton}
                          disabled={deletingMemories.has(related.id)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                      {renderMarkdown(related.prompt)}
                      {renderMarkdown(related.response)}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {deleteConfirmation && (
          <motion.div
            className="delete-confirmation-overlay"
            onClick={() => setDeleteConfirmation(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="delete-confirmation-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="delete-confirmation-title">Delete Memory?</div>
              <div className="delete-confirmation-message">
                Are you sure you want to delete this memory? This action cannot
                be undone.
              </div>
              <div className="delete-confirmation-docid">
                Document ID: {deleteConfirmation.docId || "Not found"}
              </div>
              <div className="delete-confirmation-buttons">
                <button
                  className="delete-confirmation-button cancel"
                  onClick={() => setDeleteConfirmation(null)}
                >
                  Cancel
                </button>
                <button
                  className="delete-confirmation-button confirm"
                  onClick={confirmDelete}
                  disabled={!deleteConfirmation.docId}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add the Image Overlay */}
      <AnimatePresence>
        {imageOverlay && (
          <motion.div
            className="image-overlay"
            onClick={closeImageOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="image-overlay-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <img
                src={imageOverlay}
                alt="Full size"
                onClick={toggleImageControls}
              />
              <AnimatePresence>
                {imageControlsVisible && (
                  <motion.div
                    className="image-overlay-controls"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      className="image-control-button back"
                      onClick={closeImageOverlay}
                      title="Back"
                    >
                      <IoMdArrowBack />
                    </button>
                    <button
                      className="image-control-button download"
                      onClick={() => handleImageDownload(imageOverlay)}
                      title="Download"
                    >
                      <FiDownload />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Update the MemoryPathOverlay component
const MemoryPathOverlay = ({ path, onClose }) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deletingMemories, setDeletingMemories] = useState(new Set());
  const [imageOverlay, setImageOverlay] = useState(null);
  const [imageControlsVisible, setImageControlsVisible] = useState(true);

  const handleDelete = async (memory) => {
    setDeleteConfirmation({
      memory,
      docId: memory.id,
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    const { memory, docId } = deleteConfirmation;
    const userID = auth.currentUser.uid;

    try {
      setDeletingMemories((prev) => new Set([...prev, docId]));
      await new Promise((resolve) => setTimeout(resolve, 300));

      const success = await deleteConversation(userID, docId);

      if (success) {
        window.dispatchEvent(new Event("memoryUpdated"));
        setDeleteConfirmation(null);
        onClose(); // Close the overlay after successful deletion
      }
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setDeletingMemories((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
      setDeleteConfirmation(null);
    }
  };

  const handleImageClick = (src) => {
    setImageOverlay(src);
  };

  const handleImageDownload = (src) => {
    window.open(src, "_blank");
  };

  const closeImageOverlay = (e) => {
    if (e) {
      e.stopPropagation(); // Stop event from bubbling up to parent overlay
    }
    setImageOverlay(null);
  };

  const toggleImageControls = (e) => {
    e.stopPropagation();
    setImageControlsVisible(!imageControlsVisible);
  };

  const renderMarkdown = (content) => (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }) {
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
                  children={String(children).replace(/\n$/, "")}
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                  className="code-block"
                />
                <button
                  className="copy-button code-block-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(
                      String(children).replace(/\n$/, ""),
                    );
                    const toast = document.createElement("div");
                    toast.className = "copied-notification";
                    toast.textContent = "Copied!";
                    document.body.appendChild(toast);
                    setTimeout(() => {
                      toast.remove();
                    }, 2000);
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
              <div className="inline-code-container">
                <code className="inline-code" {...props}>
                  {children}
                </code>
                <button
                  className="copy-button inline-code-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(inlineText);
                    const toast = document.createElement("div");
                    toast.className = "copied-notification";
                    toast.textContent = "Copied!";
                    document.body.appendChild(toast);
                    setTimeout(() => {
                      toast.remove();
                    }, 2000);
                  }}
                  title="Copy code"
                >
                  <FiCopy />
                </button>
              </div>
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
    <motion.div
      style={styles.pathOverlay}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        style={styles.pathContent}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        <div style={styles.pathHeader}>
          <h3 style={styles.pathTitle}>Memory Path</h3>
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        </div>
        <div style={styles.pathBody}>
          <div style={styles.pathNode}>
            <div style={styles.pathNodeHeader}>
              <div style={styles.pathNodeTitle}>Your Prompt</div>
              <div style={styles.timestamp}>
                {formatDateTime(path.timestamp)}
              </div>
            </div>
            {renderMarkdown(path.prompt)}
          </div>
          {path.children.map((child, index) => (
            <div key={child.id || index} style={styles.pathNode}>
              <div style={styles.pathNodeHeader}>
                <div>
                  <div style={styles.pathNodeTitle}>Memory {index + 1}</div>
                  <div style={styles.timestamp}>
                    {formatDateTime(child.timestamp)}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(child)}
                  style={styles.deleteButton}
                  disabled={deletingMemories.has(child.id)}
                >
                  <FaTrash />
                </button>
              </div>
              <div style={styles.pathNodeContent}>
                {renderMarkdown(child.prompt)}
                {child.response && renderMarkdown(child.response)}
                {child.children?.map((grandChild, idx) => (
                  <div key={grandChild.id || idx} style={styles.pathNodeChild}>
                    <div style={styles.pathNodeChildHeader}>
                      <div style={styles.pathNodeChildLeft}>
                        <div style={styles.pathNodeChildTitle}>
                          Related {index + 1}.{idx + 1}
                        </div>
                        <div style={styles.timestamp}>
                          {formatDateTime(grandChild.timestamp)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(grandChild)}
                        style={styles.deleteButton}
                        disabled={deletingMemories.has(grandChild.id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                    {renderMarkdown(grandChild.prompt)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {deleteConfirmation && (
          <motion.div
            className="delete-confirmation-overlay"
            onClick={() => setDeleteConfirmation(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="delete-confirmation-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className="delete-confirmation-title">Delete Memory?</div>
              <div className="delete-confirmation-message">
                Are you sure you want to delete this memory? This action cannot
                be undone.
              </div>
              <div className="delete-confirmation-docid">
                Document ID: {deleteConfirmation.docId || "Not found"}
              </div>
              <div className="delete-confirmation-buttons">
                <button
                  className="delete-confirmation-button cancel"
                  onClick={() => setDeleteConfirmation(null)}
                >
                  Cancel
                </button>
                <button
                  className="delete-confirmation-button confirm"
                  onClick={confirmDelete}
                  disabled={!deleteConfirmation.docId}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update the Image Overlay */}
      <AnimatePresence>
        {imageOverlay && (
          <motion.div
            className="image-overlay"
            onClick={(e) => {
              e.stopPropagation(); // Stop propagation to parent overlay
              closeImageOverlay(e);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="image-overlay-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <img
                src={imageOverlay}
                alt="Full size"
                onClick={toggleImageControls}
              />
              <AnimatePresence>
                {imageControlsVisible && (
                  <motion.div
                    className="image-overlay-controls"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      className="image-control-button back"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeImageOverlay(e);
                      }}
                      title="Back"
                    >
                      <IoMdArrowBack />
                    </button>
                    <button
                      className="image-control-button download"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageDownload(imageOverlay);
                      }}
                      title="Download"
                    >
                      <FiDownload />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MemoryNetwork = ({ memories = [], onClose }) => {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [viewMode, setViewMode] = useState("tree");

  const handleNodeClick = (nodeId, nodes) => {
    const clickedNode = nodes.get(nodeId);
    let path = null;

    if (nodeId === 1) {
      path = {
        prompt: memories[0].prompt,
        timestamp: memories[0].timestampString || memories[0].timestamp,
        children:
          memories[0].related?.map((mem) => ({
            prompt: mem.prompt,
            response: mem.response,
            id: mem.id,
            timestamp: mem.timestampString || mem.timestamp,
          })) || [],
      };
    } else {
      const parentMemory = memories[0].related?.find(
        (mem) =>
          mem.prompt === clickedNode.title ||
          mem.related?.some((r) => r.prompt === clickedNode.title),
      );

      if (parentMemory) {
        path = {
          prompt: memories[0].prompt,
          timestamp: memories[0].timestampString || memories[0].timestamp,
          children: [
            {
              prompt: parentMemory.prompt,
              response: parentMemory.response,
              id: parentMemory.id,
              timestamp: parentMemory.timestampString || parentMemory.timestamp,
              children:
                parentMemory.related?.map((mem) => ({
                  prompt: mem.prompt,
                  response: mem.response,
                  id: mem.id,
                  timestamp: mem.timestampString || mem.timestamp,
                })) || [],
            },
          ],
        };
      }
    }

    if (path) {
      setSelectedPath(path);
    }
  };

  useEffect(() => {
    if (!containerRef.current || !memories[0] || viewMode !== "tree") return;

    const nodes = new DataSet();
    const edges = new DataSet();
    let nodeId = 1;

    const centralId = nodeId++;
    nodes.add({
      id: centralId,
      label: "Your Prompt",
      title: memories[0].prompt,
      color: "#FF5733",
      size: 30,
      font: { size: 16 },
    });

    memories[0].related?.forEach((memory, index) => {
      const parentId = nodeId++;
      nodes.add({
        id: parentId,
        label: `Memory ${index + 1}`,
        title: memory.prompt,
        color: "#3498DB",
        size: 25,
      });
      edges.add({
        from: centralId,
        to: parentId,
        length: 200,
      });

      memory.related?.forEach((relatedMemory, relatedIndex) => {
        const childId = nodeId++;
        nodes.add({
          id: childId,
          label: `Related ${index + 1}.${relatedIndex + 1}`,
          title: relatedMemory.prompt,
          color: "#2ECC71",
          size: 20,
        });
        edges.add({
          from: parentId,
          to: childId,
          length: 150,
        });
      });
    });

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

    networkRef.current = new Network(
      containerRef.current,
      { nodes, edges },
      options,
    );

    networkRef.current.on("click", (params) => {
      if (params.nodes.length > 0) {
        handleNodeClick(params.nodes[0], nodes);
      }
    });

    networkRef.current.on("selectNode", (params) => {
      if (params.nodes.length > 0) {
        handleNodeClick(params.nodes[0], nodes);
      }
    });

    const hammer = new window.Hammer(containerRef.current);
    hammer.on("tap", (event) => {
      const { offsetX, offsetY } = event.srcEvent;
      const nodeId = networkRef.current.getNodeAt({ x: offsetX, y: offsetY });
      if (nodeId) {
        handleNodeClick(nodeId, nodes);
      }
    });

    return () => {
      networkRef.current.destroy();
      hammer.destroy();
    };
  }, [memories, viewMode]);

  useEffect(() => {
    if (memories[0]) {
      console.log("Memory data:", {
        mainTimestamp: memories[0].timestamp,
        mainTimestampString: memories[0].timestampString,
        relatedMemories: memories[0].related?.map((m) => ({
          id: m.id,
          timestamp: m.timestamp,
          timestampString: m.timestampString,
        })),
      });
    }
  }, [memories]);

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
          <TableView memories={memories} onMemoryClick={handleNodeClick} />
        )}
      </div>

      <AnimatePresence>
        {selectedPath && (
          <MemoryPathOverlay
            path={selectedPath}
            onClose={() => setSelectedPath(null)}
          />
        )}
      </AnimatePresence>
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
  closeButton: {
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
  pathNodeTitle: {
    color: "#72767d",
    fontSize: "14px",
    marginBottom: "8px",
    fontWeight: 500,
  },
  pathNodeContent: {
    backgroundColor: "#2f3136",
    padding: "16px",
    borderRadius: "8px",
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
  pathNodeChild: {
    marginTop: "12px",
    padding: "12px",
    backgroundColor: "#40444b",
    borderRadius: "4px",
  },
  pathNodeChildTitle: {
    color: "#72767d",
    fontSize: "12px",
    marginBottom: "4px",
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
    overflow: "auto",
    boxSizing: "border-box",
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
    transition: "background-color 0.2s ease",
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
    boxSizing: "border-box",
  },
  memoryActions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  deleteButton: {
    background: "none",
    border: "none",
    color: "#ff4444",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
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

  timestamp: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: "0.8em",
    marginLeft: "8px",
    fontFamily: "monospace",
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

  timestamp: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: "0.8em",
    marginLeft: "8px",
    fontFamily: "monospace",
    whiteSpace: "nowrap",
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
};

export default MemoryNetwork;
