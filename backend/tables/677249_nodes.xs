table nodes {
  auth = false

  schema {
    // Unique identifier for the node
    uuid id
  
    // Reference to the parent node (self-referencing)
    uuid parent_id? {
      table = "nodes"
    }
  
    // Reference to the objective step this node belongs to
    uuid objective_step_id {
      table = "objective_steps"
    }
  
    // Type of node
    enum node_type?=folder {
      values = ["folder", "file"]
    }
  
    // Name of the node
    text name filters=trim
  
    // Full path of the node
    text path filters=trim
  
    // Timestamp when the node was created
    timestamp created_at?=now
  
    // Timestamp when the node was last updated
    timestamp updated_at?=now
  
    json properties?
    int index?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "objective_step_id"}, {name: "path"}]
    }
    {type: "btree", field: [{name: "parent_id", op: "asc"}]}
    {
      type : "btree"
      field: [{name: "objective_step_id", op: "asc"}]
    }
  ]
}