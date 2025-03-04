import { useState } from "react";
import { useNavigate } from "react-router";
import { removeUserFromFirestore } from "../control/firebase";
import { useAuth } from "../hooks/useAuth";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import "./TermsOfService.css";

const TermsOfService = ({ onClose, isNewAccount = false, onAccept }) => {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleAccept = () => {
    if (isNewAccount) {
      // Set hasSeenTOS in localStorage when accepting during account creation
      localStorage.setItem("hasSeenTOS", "true");
      
      // Call the onAccept callback if provided (for sign-up process)
      if (onAccept) {
        onAccept();
      }
    }
    setIsVisible(false);
    if (onClose) onClose();
  };

  const handleDecline = async () => {
    if (isNewAccount) {
      // Delete the user's account
      if (user?.uid) {
        await removeUserFromFirestore(user?.uid);
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

  // TOS content as markdown
  const tosContent = `
# Terms of Service
## Last Updated: October 29, 2024

Welcome to Omni Aura LLC ("Omni Aura", "we", "us", or "our"). These Terms of Service ("Terms") govern your access to and use of our website, applications, and other products and services (collectively, the "Services").

**Please read these Terms carefully before accessing or using the Services.** By accessing or using any part of the Services, you agree to be bound by these Terms. If you disagree with any part of the Terms, then you may not access or use the Services.

### 1. Eligibility

You must be at least 13 years old to use the Services. By agreeing to these Terms, you represent and warrant to us that you are 13 years of age or older. If you are under the age of 18, you may only use the Services with the consent and supervision of a parent or legal guardian.

### 2. Account Creation and Security

You may need to create an account to use some of the Services. You are responsible for:

* Providing accurate, current, and complete information during the registration process and keeping it updated.
* Maintaining the confidentiality of your account and password, and for all activity that occurs under your account.
* Notifying us immediately of any unauthorized access to or use of your account.

We reserve the right to refuse service, terminate accounts, or remove or edit content in our sole discretion.

### 3. User Content

Our Services may allow you to submit, post, or display content, including but not limited to text, graphics, photos, videos, and links ("User Content"). You retain all ownership rights in and are solely responsible for your User Content. You grant us a non-exclusive, transferable, sub-licensable, royalty-free, worldwide license to use, reproduce, modify, adapt, publish, translate, distribute, and display your User Content in connection with operating and providing the Services.

You represent and warrant that you own all rights in and to your User Content or that you have all necessary rights and permissions to grant us the license above.

### 4. Prohibited Conduct

You are responsible for all activity and content (including User Content) associated with your use of the Services.

You agree not to engage in any of the following prohibited activities:

* Using the Services for any illegal or unauthorized purpose.
* Violating any local, state, national, or international law or regulation.
* Infringing upon the rights of others, including intellectual property rights.
* Impersonating another person or entity.
* Uploading, transmitting, or otherwise making available any content that is harmful, threatening, abusive, harassing, tortious, defamatory, vulgar, obscene, libelous, invasive of another's privacy, hateful, or racially, ethnically or otherwise objectionable.
* Interfering with or disrupting the Services or servers or networks connected to the Services.
* Attempting to gain unauthorized access to any portion of the Services or any other systems or networks.
* Using any automated systems, including but not limited to "bots", "scrapers," or "offline readers" to access, interact with, or collect data from the Services.

### 5. Intellectual Property Rights

The Services and their entire contents, features, and functionality, including but not limited to information, software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof, are owned by Omni Aura, its licensors, or other providers of such material and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.

### 6. Termination

We may terminate your access to all or any part of the Services at any time, with or without cause, with or without notice, effective immediately.

### 7. Disclaimer of Warranties

The Services and all information, content, materials, products, and other services included on or otherwise made available to you through the Services are provided by Omni Aura on an "as is" and "as available" basis.

Omni Aura makes no representations or warranties of any kind, express or implied, as to the operation of the Services or the information, content, materials, products, or other services included on or otherwise made available to you through the Services. You expressly agree that your use of the Services is at your sole risk.

### 8. Limitation of Liability

To the fullest extent permitted by law, Omni Aura, its officers, directors, employees, agents, licensors, and suppliers will not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.

### 9. Contact Us

If you have any questions about these Terms, please contact us at [support@heyditto.ai](mailto:support@heyditto.ai).
`;

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
          <MarkdownRenderer content={tosContent} />
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
