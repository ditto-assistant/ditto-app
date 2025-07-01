# Migration from vis-network to Cytoscape.js

## Background

We are currently using vis-network for network graph visualization in our application's memory network component. After thorough research and evaluation, we've decided to migrate to Cytoscape.js due to its superior maintenance status, performance with large networks, and richer feature set.

## Why Migrate?

### Maintenance Status Comparison

| Metric            | vis-network         | Cytoscape.js                         |
| ----------------- | ------------------- | ------------------------------------ |
| Last release      | ~1 year ago (9.1.9) | February 2025                        |
| Weekly downloads  | ~120,000            | ~1.1 million                         |
| GitHub stars      | ~3,200              | ~10,300                              |
| Open issues       | ~335                | ~18                                  |
| Release frequency | Infrequent          | Monthly (features), Weekly (patches) |

### Performance Benefits

- **Large Network Handling**: Cytoscape.js can efficiently handle 100,000+ nodes and edges, while vis-network struggles with larger datasets
- **Memory Efficiency**: Better memory management for complex visualizations
- **Layout Algorithms**: More optimized force-directed layout algorithms

### Feature Advantages

- **Graph Analysis**: Rich set of built-in graph theory algorithms
- **Extension Ecosystem**: Extensive plugin ecosystem for added functionality
- **Styling Capabilities**: More powerful visual styling options
- **Event Handling**: More robust event system

## Migration Plan

### Phase 1: Preparation (1-2 weeks)

1. **Install and configure Cytoscape.js**

   ```bash
   npm install cytoscape
   # Optional extensions
   npm install cytoscape-fcose  # Force-directed layout
   npm install cytoscape-navigator  # Mini-map navigator
   ```

2. **Create a proof of concept**
   - Implement a simple network using Cytoscape.js
   - Test with a subset of our memory network data
   - Verify performance metrics

### Phase 2: Implementation (2-3 weeks)

1. **Adapt data structure**

   - Transform our existing network data model to Cytoscape.js format
   - Create data conversion utilities if needed

2. **Implement core visualization**

   ```typescript
   const cy = cytoscape({
     container: document.getElementById("memory-network-container"),
     elements: [
       // nodes and edges from our data
     ],
     style: [
       // style definitions
     ],
     layout: {
       name: "fcose",
       // layout options
     },
   })
   ```

3. **Recreate interaction handlers**
   - Node click/select events
   - Edge interactions
   - Zooming and panning behavior
   - Network stabilization

### Phase 3: Feature Parity & Enhancement (2-3 weeks)

1. **Implement memory network specific features**

   - Node grouping and filtering
   - Layout preferences
   - Memory-specific visualizations

2. **Add new capabilities**

   - Enhanced clustering
   - Improved performance for large memory networks
   - Better visual organization of memory hierarchies

3. **Optimize performance**
   - Implement best practices for large graphs
   - Add level-of-detail rendering
   - Optimize layout calculations

### Phase 4: Testing & Rollout (2 weeks)

1. **Comprehensive testing**

   - Performance testing with large networks
   - Comparison against current vis-network implementation
   - Cross-browser compatibility

2. **Documentation**

   - Update component documentation
   - Add developer notes for future maintenance
   - Document API and event handling

3. **Gradual rollout**
   - Feature flag for switching between implementations
   - Monitoring for any performance issues
   - User feedback collection

## Technical Considerations

### Key API Differences

```typescript
// vis-network example (current)
const nodes = new vis.DataSet([
  { id: 1, label: "Node 1" },
  { id: 2, label: "Node 2" },
])
const edges = new vis.DataSet([{ from: 1, to: 2 }])
const data = { nodes, edges }
const network = new vis.Network(container, data, options)

// Cytoscape.js equivalent (target)
const cy = cytoscape({
  container: container,
  elements: [
    { data: { id: "1", label: "Node 1" } },
    { data: { id: "2", label: "Node 2" } },
    { data: { id: "e1", source: "1", target: "2" } },
  ],
  style: [
    {
      selector: "node",
      style: {
        label: "data(label)",
      },
    },
  ],
})
```

### Event Handling Differences

```typescript
// vis-network (current)
network.on("click", (params) => {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0]
    // Handle node click
  }
})

// Cytoscape.js (target)
cy.on("tap", "node", (event) => {
  const node = event.target
  // Handle node click
})
```

## Resources

- [Cytoscape.js Documentation](https://js.cytoscape.org/)
- [Cytoscape.js GitHub Repository](https://github.com/cytoscape/cytoscape.js)
- [Example Layouts](https://js.cytoscape.org/demos/layouts/)
- [Style Reference](https://js.cytoscape.org/demos/style/)
- [Collection API](https://js.cytoscape.org/demos/collection-api/)

## Impact Assessment

### Positive Impacts

- Better performance with large memory networks
- More reliable long-term maintenance
- Enhanced visualization capabilities
- Future extensibility

### Potential Challenges

- Learning curve for developers
- Ensuring feature parity during transition
- Adapting existing data structures

## Timeline

- **Total Migration Time**: 7-10 weeks
- **Dependencies**: None identified that would block progress
- **Suggested Start**: Next sprint cycle

## Conclusion

Migrating from vis-network to Cytoscape.js represents a strategic investment in our memory network visualization functionality. The superior maintenance status, performance characteristics, and richer feature set of Cytoscape.js will provide better scalability and user experience as our application grows. The migration plan outlined above provides a structured approach to minimize disruption while ensuring a successful transition.
