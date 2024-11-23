import { useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";
import ReactMarkdown from "react-markdown";
import { FaTable, FaProjectDiagram, FaTimes, FaTrash } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  IoMdArrowBack,
  IoMdArrowDropdown,
} from "react-icons/io";
import { FiDownload, FiCopy } from "react-icons/fi";
import { auth } from "../control/firebase";
import { deleteConversation } from "../control/memory";
import { LoadingSpinner } from "./LoadingSpinner";

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

// Add this component near the top of the file
const DeleteConfirmationContent = ({
  deleteConfirmation,
  setDeleteConfirmation,
  confirmDelete,
  isDeletingMessage,
}) => (
  <motion.div
    className="delete-confirmation-content"
    onClick={(e) => e.stopPropagation()}
    initial={{ scale: 0.9, opacity: 0, y: 50 }}
    animate={{ scale: 1, opacity: 1, y: 0 }}
    exit={{ scale: 0.9, opacity: 0, y: 50 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    style={styles.deleteConfirmationContent}
  >
    <div style={styles.deleteConfirmationTitle}>Delete Memory?</div>
    <div style={styles.deleteConfirmationMessage}>
      Are you sure you want to delete this memory? This action cannot be undone.
    </div>
    {isDeletingMessage ? (
      <div style={styles.deleteConfirmationLoading}>
        <LoadingSpinner size={24} inline={true} />
        <div>Deleting memory...</div>
      </div>
    ) : (
      <>
        <div style={styles.deleteConfirmationDocId}>
          Document ID: {deleteConfirmation.docId || "Not found"}
        </div>
        <div style={styles.deleteConfirmationButtons}>
          <button
            style={styles.deleteConfirmationButtonCancel}
            onClick={() => setDeleteConfirmation(null)}
          >
            Cancel
          </button>
          <button
            style={styles.deleteConfirmationButtonConfirm}
            onClick={confirmDelete}
            disabled={!deleteConfirmation.docId}
          >
            Delete
          </button>
        </div>
      </>
    )}
  </motion.div>
);

// Update the TableView component
const TableView = ({ memories, onMemoryClick }) => {
  const [selectedParent, setSelectedParent] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [deletingMemories, setDeletingMemories] = useState(new Set());
  const [imageOverlay, setImageOverlay] = useState(null);
  const [imageControlsVisible, setImageControlsVisible] = useState(true);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

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
      setIsDeletingMessage(true);
      setDeletingMemories((prev) => new Set([...prev, docId]));

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
      setIsDeletingMessage(false);
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
                      String(children).replace(/\n$/, "")
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
              memories[0]?.timestampString || memories[0]?.timestamp
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
            onClick={() => !isDeletingMessage && setDeleteConfirmation(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DeleteConfirmationContent
              deleteConfirmation={deleteConfirmation}
              setDeleteConfirmation={setDeleteConfirmation}
              confirmDelete={confirmDelete}
              isDeletingMessage={isDeletingMessage}
            />
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
  const [expandedMemories, setExpandedMemories] = useState(new Set());
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

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
      setIsDeletingMessage(true);
      setDeletingMemories((prev) => new Set([...prev, docId]));

      const success = await deleteConversation(userID, docId);

      if (success) {
        window.dispatchEvent(new Event("memoryUpdated"));
        setDeleteConfirmation(null);
        onClose(); // Close the overlay after successful deletion
      }
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setIsDeletingMessage(false);
      setDeletingMemories((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
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

  const toggleExpand = (memoryId) => {
    setExpandedMemories((prev) => {
      const next = new Set(prev);
      if (next.has(memoryId)) {
        next.delete(memoryId);
      } else {
        next.add(memoryId);
      }
      return next;
    });
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
                      String(children).replace(/\n$/, "")
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

  // Add this helper component for consistent message display
  const MemoryMessage = ({ prompt, response }) => {
    const [profilePic, setProfilePic] = useState(() => {
      return localStorage.getItem("userAvatar") || "/user_placeholder.png";
    });
    const [dittoAvatar, setDittoAvatar] = useState(() => {
      return localStorage.getItem("dittoAvatar") || "/logo512.png";
    });

    useEffect(() => {
      // Cache Ditto avatar if not already cached
      if (!localStorage.getItem("dittoAvatar")) {
        fetch("/logo512.png")
          .then((response) => response.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result;
              localStorage.setItem("dittoAvatar", base64data);
              setDittoAvatar(base64data);
            };
            reader.readAsDataURL(blob);
          })
          .catch((error) =>
            console.error("Error caching Ditto avatar:", error)
          );
      }
    }, []);

    return (
      <div style={styles.messageContainer}>
        <div style={styles.userMessage}>
          <div style={styles.messageHeader}>
            <img src={profilePic} alt="User" style={styles.avatar} />
            <div style={styles.messageContent}>
              {prompt && renderMarkdown(prompt)}
            </div>
          </div>
        </div>
        {response && (
          <>
            <div style={styles.messagesDivider} />
            <div style={styles.dittoMessage}>
              <div style={styles.messageHeader}>
                <img src={dittoAvatar} alt="Ditto" style={styles.avatar} />
                <div style={styles.messageContent}>
                  {renderMarkdown(response)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <motion.div style={styles.pathOverlay} onClick={onClose}>
      <motion.div
        style={styles.pathContent}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.pathHeader}>
          <h3 style={styles.pathTitle}>Memory Path</h3>
          <button onClick={onClose} style={styles.closeButton}>
            <FaTimes />
          </button>
        </div>
        <div style={styles.pathBody}>
          {/* Your Prompt Section */}
          <div style={styles.pathNode}>
            <div style={styles.pathNodeHeader}>
              <div>
                <div style={styles.pathNodeTitle}>Your Prompt</div>
                <div style={styles.timestamp}>
                  {formatDateTime(path.timestamp)}
                </div>
              </div>
            </div>
            {renderMarkdown(path.prompt)}
          </div>

          {/* Memory Sections */}
          {path.children.map((child) => (
            <div key={child.id} style={styles.pathNode}>
              <div style={styles.pathNodeHeader}>
                <div>
                  <div style={styles.pathNodeTitle}>Memory {child.index}</div>
                  <div style={styles.timestamp}>
                    {formatDateTime(child.timestamp)}
                  </div>
                </div>
                <div style={styles.memoryActions}>
                  {child.children?.length > 0 && (
                    <button
                      style={styles.relatedButton}
                      onClick={() => toggleExpand(child.id)}
                      title={
                        expandedMemories.has(child.id)
                          ? "Hide Related"
                          : "Show Related"
                      }
                    >
                      <span style={styles.relatedButtonText}>
                        {expandedMemories.has(child.id)
                          ? "Hide Related"
                          : "Show Related"}
                      </span>
                      <motion.div
                        animate={{
                          rotate: expandedMemories.has(child.id) ? 180 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                        style={styles.relatedButtonIcon}
                      >
                        <IoMdArrowDropdown />
                      </motion.div>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(child)}
                    style={styles.deleteButton}
                    disabled={deletingMemories.has(child.id)}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              <div style={styles.pathNodeContent}>
                <MemoryMessage
                  prompt={child.prompt}
                  response={child.response}
                />

                {/* Related Memories */}
                {expandedMemories.has(child.id) &&
                  child.children?.map((grandChild) => (
                    <motion.div
                      key={grandChild.id}
                      style={styles.pathNodeChild}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div style={styles.pathNodeChildHeader}>
                        <div style={styles.pathNodeChildLeft}>
                          <div style={styles.pathNodeChildTitle}>
                            Related {grandChild.parentIndex}.{grandChild.index}
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
                      <MemoryMessage
                        prompt={grandChild.prompt}
                        response={grandChild.response}
                      />
                    </motion.div>
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
            onClick={() => !isDeletingMessage && setDeleteConfirmation(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DeleteConfirmationContent
              deleteConfirmation={deleteConfirmation}
              setDeleteConfirmation={setDeleteConfirmation}
              confirmDelete={confirmDelete}
              isDeletingMessage={isDeletingMessage}
            />
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

// Add the MemoryNodeOverlay component
const MemoryNodeOverlay = ({ node, onClose, onDelete }) => {
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [imageOverlay, setImageOverlay] = useState(null);
  const [imageControlsVisible, setImageControlsVisible] = useState(true);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  const handleDelete = () => {
    setDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    setIsDeletingMessage(true);
    const userID = auth.currentUser.uid;

    try {
      const success = await deleteConversation(userID, node.id);

      if (success) {
        onDelete(node.id);
        setDeleteConfirmation(false);
        onClose();
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const handleImageClick = (src) => {
    setImageOverlay(src);
  };

  const closeImageOverlay = () => {
    setImageOverlay(null);
  };

  const toggleImageControls = (e) => {
    e.stopPropagation();
    setImageControlsVisible(!imageControlsVisible);
  };

  // Define renderMarkdown within the scope of MemoryNodeOverlay
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
                      String(children).replace(/\n$/, "")
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

        {/* Delete Confirmation Overlay */}
        {deleteConfirmation && (
          <motion.div
            className="delete-confirmation-overlay"
            onClick={() => setDeleteConfirmation(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.deleteConfirmationOverlay}
          >
            <motion.div
              className="delete-confirmation-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={styles.deleteConfirmationContent}
            >
              <div style={styles.deleteConfirmationTitle}>Delete Memory?</div>
              <div style={styles.deleteConfirmationMessage}>
                Are you sure you want to delete this memory? This action cannot
                be undone.
              </div>
              {isDeletingMessage ? (
                <div style={styles.deleteConfirmationLoading}>
                  <LoadingSpinner size={24} inline={true} />
                  <div>Deleting memory...</div>
                </div>
              ) : (
                <div style={styles.deleteConfirmationButtons}>
                  <button
                    style={styles.deleteConfirmationButtonCancel}
                    onClick={() => setDeleteConfirmation(false)}
                  >
                    Cancel
                  </button>
                  <button
                    style={styles.deleteConfirmationButtonConfirm}
                    onClick={confirmDelete}
                  >
                    Delete
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
        {/* Image Overlay */}
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
      </motion.div>
    </AnimatePresence>
  );
};

// Update the MemoryNetwork component
const MemoryNetwork = ({ memories = [], onClose, onMemoryDeleted }) => {
  const [nodesData, setNodesData] = useState(memories);
  const [viewMode, setViewMode] = useState("tree");
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const nodeIdMapRef = useRef({});

  const handleMemoryDeleted = (deletedId) => {
    // Remove the deleted memory from the nodes data
    const updatedNodes = removeMemoryById(nodesData, deletedId);
    setNodesData(updatedNodes);

    // Re-build the network
    buildNetwork(updatedNodes);

    if (onMemoryDeleted) {
      onMemoryDeleted(deletedId);
    }
  };

  const removeMemoryById = (nodes, id) => {
    const newNodes = JSON.parse(JSON.stringify(nodes)); // Deep copy
    const removeHelper = (memories) => {
      return memories.filter((memory) => {
        if (memory.id === id) {
          return false;
        }
        if (memory.related) {
          memory.related = removeHelper(memory.related);
        }
        return true;
      });
    };
    newNodes[0].related = removeHelper(newNodes[0].related || []);
    return newNodes;
  };

  const buildNetwork = (nodesData) => {
    if (!containerRef.current) return;

    const nodes = new DataSet();
    const edges = new DataSet();
    let nodeId = 1;
    const nodeIdMap = {};

    const centralId = nodeId++;
    nodes.add({
      id: centralId,
      label: "Your Prompt",
      title: nodesData[0].prompt,
      color: "#FF5733",
      size: 30,
      font: { size: 16 },
    });
    nodeIdMap[centralId] = {
      prompt: nodesData[0].prompt,
      response: nodesData[0].response || "",
      timestamp: nodesData[0].timestampString || nodesData[0].timestamp,
      id: nodesData[0].id,
    };

    nodesData[0].related?.forEach((memory, index) => {
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
      nodeIdMap[parentId] = {
        prompt: memory.prompt,
        response: memory.response || "",
        timestamp: memory.timestampString || memory.timestamp,
        id: memory.id,
      };

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
        nodeIdMap[childId] = {
          prompt: relatedMemory.prompt,
          response: relatedMemory.response || "",
          timestamp: relatedMemory.timestampString || relatedMemory.timestamp,
          id: relatedMemory.id,
        };
      });
    });

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

    networkRef.current.on("selectNode", (params) => {
      if (params.nodes.length > 0) {
        handleNodeClick(params.nodes[0]);
      }
    });

    const hammer = new window.Hammer(containerRef.current);
    hammer.on("tap", (event) => {
      const { offsetX, offsetY } = event.srcEvent;
      const nodeId = networkRef.current.getNodeAt({ x: offsetX, y: offsetY });
      if (nodeId) {
        handleNodeClick(nodeId);
      }
    });

    return () => {
      networkRef.current.destroy();
      hammer.destroy();
    };
  };

  const handleNodeClick = (nodeId) => {
    // Get the data for the clicked node from the nodeIdMap
    const data = nodeIdMapRef.current[nodeId];
    if (data) {
      setSelectedNode(data);
    }
  };

  useEffect(() => {
    buildNetwork(nodesData);
  }, [nodesData]);

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

      {/* Add the MemoryNodeOverlay component */}
      {selectedNode && (
        <MemoryNodeOverlay
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onDelete={(id) => handleMemoryDeleted(id)}
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
  pathNodeChild: {
    marginTop: "16px",
    backgroundColor: "#40444b",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    padding: "16px",
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
    marginRight: "4px",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  },

  expandIcon: {
    fontSize: "24px",
    color: "#ffffff",
  },

  // Update memoryActions to better align the buttons
  memoryActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    "& > *:not(:last-child)": {
      marginRight: "4px",
    },
  },

  // Update pathNodeChild for animation
  pathNodeChild: {
    marginTop: "16px",
    padding: "12px",
    backgroundColor: "#40444b",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
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

  // Update memoryActions
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

  // Update pathNodeChild animation
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

  deleteConfirmationOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5001,
    backdropFilter: "blur(5px)",
    padding: "20px",
  },
  deleteConfirmationContent: {
    backgroundColor: "#36393f",
    borderRadius: "12px",
    padding: "24px",
    width: "90%",
    maxWidth: "400px",
    textAlign: "center",
    color: "#ffffff",
  },
  deleteConfirmationTitle: {
    fontSize: "1.2em",
    marginBottom: "16px",
    fontWeight: "600",
  },
  deleteConfirmationMessage: {
    marginBottom: "24px",
    color: "rgba(255, 255, 255, 0.8)",
    lineHeight: "1.4",
  },
  deleteConfirmationButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
  },
  deleteConfirmationButtonCancel: {
    backgroundColor: "#4f545c",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "10px 20px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  deleteConfirmationButtonConfirm: {
    backgroundColor: "#ed4245",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "10px 20px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  deleteConfirmationLoading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "20px",
    color: "rgba(255, 255, 255, 0.8)",
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
  deleteButton: {
    background: "#ed4245",
    color: "#ffffff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
    transition: "background-color 0.2s ease",
  },
};

export default MemoryNetwork;
