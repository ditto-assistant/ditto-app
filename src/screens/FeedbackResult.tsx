import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { HomeButton } from "../components/HomeButton";
import "./FeedbackResult.css";

const containerVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { duration: 0.3 },
};

const iconVariants = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  transition: {
    type: "spring",
    stiffness: 260,
    damping: 20,
    delay: 0.2,
  },
};

const itemVariants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
};

export default function FeedbackResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="feedback-result-overlay">
      <motion.div
        className="feedback-result-container"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        <div className="feedback-result-content">
          <motion.div
            variants={iconVariants}
            initial="initial"
            animate="animate"
          >
            {error ? (
              <FaExclamationCircle className="feedback-result-icon error" />
            ) : (
              <FaCheckCircle className="feedback-result-icon success" />
            )}
          </motion.div>
          <motion.h1
            className="feedback-result-title"
            variants={itemVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.3 }}
          >
            {error ? "Failed to Submit Feedback" : "Feedback Submitted"}
          </motion.h1>
          <motion.p
            className="feedback-result-subtitle"
            variants={itemVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.4 }}
          >
            {error || "Thank you for your feedback!"}
          </motion.p>

          <motion.div
            className="feedback-result-button-container"
            variants={itemVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.5 }}
          >
            <HomeButton />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
