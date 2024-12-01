import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { removeUserFromFirestore } from "../control/firebase";
import "./TermsOfService.css";

const TermsOfService = ({ onClose, isNewAccount = false }) => {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  const handleAccept = () => {
    if (isNewAccount) {
      // Set hasSeenTOS in localStorage when accepting during account creation
      localStorage.setItem("hasSeenTOS", "true");
    }
    setIsVisible(false);
    if (onClose) onClose();
  };

  const handleDecline = async () => {
    if (isNewAccount) {
      // Delete the user's account
      const userID = localStorage.getItem("userID");
      if (userID) {
        await removeUserFromFirestore(userID);
      }
      // Clear local storage
      localStorage.clear();
      // Navigate to login page
      navigate("/login");
    } else {
      setIsVisible(false);
      if (onClose) onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="tos-overlay">
      <div className="tos-container">
        <div className="tos-header">
          <h2>Terms of Service</h2>
          {!isNewAccount && (
            <button className="tos-close-button" onClick={handleDecline}>
              ×
            </button>
          )}
        </div>
        <div className="tos-content">
          <h3>Last Updated: October 29, 2024</h3>

          <p>
            Welcome to Omni Aura LLC ("Omni Aura", "we", "us", or "our"). These
            Terms of Service ("Terms") govern your access to and use of our
            website, applications, and other products and services
            (collectively, the "Services").
          </p>

          <p>
            <strong>
              Please read these Terms carefully before accessing or using the
              Services.
            </strong>{" "}
            By accessing or using any part of the Services, you agree to be
            bound by these Terms. If you disagree with any part of the Terms,
            then you may not access or use the Services.
          </p>

          <h4>1. Eligibility</h4>
          <p>
            You must be at least 13 years old to use the Services. By agreeing
            to these Terms, you represent and warrant to us that you are 13
            years of age or older. If you are under the age of 18, you may only
            use the Services with the consent and supervision of a parent or
            legal guardian.
          </p>

          <h4>2. Account Creation and Security</h4>
          <p>
            You may need to create an account to use some of the Services. You
            are responsible for:
          </p>
          <ul>
            <li>
              Providing accurate, current, and complete information during the
              registration process and keeping it updated.
            </li>
            <li>
              Maintaining the confidentiality of your account and password, and
              for all activity that occurs under your account.
            </li>
            <li>
              Notifying us immediately of any unauthorized access to or use of
              your account.
            </li>
          </ul>
          <p>
            We reserve the right to refuse service, terminate accounts, or
            remove or edit content in our sole discretion.
          </p>

          <h4>3. User Content</h4>
          <p>
            Our Services may allow you to submit, post, or display content,
            including but not limited to text, graphics, photos, videos, and
            links ("User Content"). You retain all ownership rights in and are
            solely responsible for your User Content. You grant us a
            non-exclusive, transferable, sub-licensable, royalty-free, worldwide
            license to use, reproduce, modify, adapt, publish, translate,
            distribute, and display your User Content in connection with
            operating and providing the Services.
          </p>

          <p>
            You represent and warrant that you own all rights in and to your
            User Content or that you have all necessary rights and permissions
            to grant us the license above.
          </p>

          <h4>4. Prohibited Conduct</h4>
          <p>
            You are responsible for all activity and content (including User
            Content) associated with your use of the Services.
          </p>
          <p>
            You agree not to engage in any of the following prohibited
            activities:
          </p>
          <ul>
            <li>Using the Services for any illegal or unauthorized purpose.</li>
            <li>
              Violating any local, state, national, or international law or
              regulation.
            </li>
            <li>
              Infringing upon the rights of others, including intellectual
              property rights.
            </li>
            <li>Impersonating another person or entity.</li>
            <li>
              Uploading, transmitting, or otherwise making available any content
              that is harmful, threatening, abusive, harassing, tortious,
              defamatory, vulgar, obscene, libelous, invasive of another's
              privacy, hateful, or racially, ethnically or otherwise
              objectionable.
            </li>
            <li>
              Interfering with or disrupting the Services or servers or networks
              connected to the Services.
            </li>
            <li>
              Attempting to gain unauthorized access to any portion of the
              Services or any other systems or networks.
            </li>
            <li>
              Using any automated systems, including but not limited to "bots",
              "scrapers," or "offline readers" to access, interact with, or
              collect data from the Services.
            </li>
          </ul>

          <h4>5. Intellectual Property Rights</h4>
          <p>
            The Services and their entire contents, features, and functionality,
            including but not limited to information, software, text, displays,
            images, video, and audio, and the design, selection, and arrangement
            thereof, are owned by Omni Aura, its licensors, or other providers
            of such material and are protected by United States and
            international copyright, trademark, patent, trade secret, and other
            intellectual property or proprietary rights laws.
          </p>

          <h4>6. Termination</h4>
          <p>
            We may terminate your access to all or any part of the Services at
            any time, with or without cause, with or without notice, effective
            immediately.
          </p>

          <h4>7. Disclaimer of Warranties</h4>
          <p>
            The Services and all information, content, materials, products, and
            other services included on or otherwise made available to you
            through the Services are provided by Omni Aura on an "as is" and "as
            available" basis.
          </p>

          <p>
            Omni Aura makes no representations or warranties of any kind,
            express or implied, as to the operation of the Services or the
            information, content, materials, products, or other services
            included on or otherwise made available to you through the Services.
            You expressly agree that your use of the Services is at your sole
            risk.
          </p>

          <h4>8. Limitation of Liability</h4>
          <p>
            To the fullest extent permitted by law, Omni Aura, its officers,
            directors, employees, agents, licensors, and suppliers will not be
            liable for any indirect, incidental, special, consequential, or
            punitive damages, including without limitation, loss of profits,
            data, use, goodwill, or other intangible losses.
          </p>

          <h4>9. Contact Us</h4>
          <p>
            If you have any questions about these Terms, please contact us at{" "}
            <a href="mailto:support@ditto.ai">support@heyditto.ai</a>.
          </p>
        </div>
        <div className="tos-footer">
          {isNewAccount ? (
            <>
              <button className="tos-decline-button" onClick={handleDecline}>
                Decline
              </button>
              <button className="tos-accept-button" onClick={handleAccept}>
                Accept
              </button>
            </>
          ) : (
            <button className="tos-close-button-bottom" onClick={handleDecline}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
