table node_files {
  auth = false

  schema {
    // Unique identifier for the node-file relationship
    uuid id
  
    // Reference to the node
    uuid node_id {
      table = "nodes"
    }
  
    // Reference to the file
    uuid file_id {
      table = "files"
    }
  
    // Order index of the file within the node
    int index filters=min:0
  
    // Timestamp when the relationship was created
    timestamp created_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "node_id"}, {name: "file_id"}]
    }
    {type: "btree", field: [{name: "node_id", op: "asc"}]}
    {type: "btree", field: [{name: "file_id", op: "asc"}]}
  ]
}