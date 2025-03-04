import React from 'react';

// Feature types
export type FeatureType = 'new' | 'improved' | 'fixed';

// Feature item interface
export interface Feature {
  type: FeatureType;
  title: string;
  description: string;
}

// Section interface
export interface Section {
  title: string;
  features: Feature[];
}

// Icons for each feature type
export const FeatureIcon = ({ type }: { type: FeatureType }) => {
  switch (type) {
    case 'new':
      return <span>✨</span>;
    case 'improved':
      return <span>⚡️</span>;
    case 'fixed':
      return <span>🐛</span>;
    default:
      return null;
  }
};

// Feature item component
export const FeatureItem = ({ 
  type, 
  title, 
  description 
}: Feature) => (
  <li className={`whats-new-feature-item feature-${type}`}>
    <div className="whats-new-feature-icon">
      <FeatureIcon type={type} />
    </div>
    <div className="whats-new-feature-text">
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  </li>
);

// Section component
export const VersionSection = ({ title, features }: Section) => (
  <div className="whats-new-section">
    <h3>{title}</h3>
    <ul className="whats-new-feature-list">
      {features.map((feature, index) => (
        <FeatureItem
          key={index}
          type={feature.type}
          title={feature.title}
          description={feature.description}
        />
      ))}
    </ul>
  </div>
);

/**
 * Instructions for creating a new version component:
 * 
 * 1. Create a new file named V{version}.tsx
 *    (e.g., V0_11_55.tsx for version 0.11.55)
 * 
 * 2. Import the necessary components:
 *    import { VersionSection } from './VersionTemplate';
 * 
 * 3. Define your sections and features:
 *    const sections = [
 *      {
 *        title: "Section Title",
 *        features: [
 *          {
 *            type: "new",
 *            title: "Feature Title",
 *            description: "Feature description"
 *          }
 *        ]
 *      }
 *    ];
 * 
 * 4. Create and export your component:
 *    const V0_11_55 = () => (
 *      <div>
 *        {sections.map((section, index) => (
 *          <VersionSection key={index} {...section} />
 *        ))}
 *      </div>
 *    );
 *    export default V0_11_55;
 * 
 * 5. Add the component to the imports and versionComponents map in WhatsNew.tsx:
 *    import V0_11_55 from './versions/V0_11_55';
 *    const versionComponents = {
 *      '0.11.55': V0_11_55,
 *      // Other versions...
 *    };
 */