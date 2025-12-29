table message_files {
  auth = false

  schema {
    // Unique identifier for the message-file relationship
    uuid id
  
    // Reference to the message
    uuid message_id {
      table = "messages"
    }
  
    // Reference to the file
    uuid file_id {
      table = "files"
    }
  
    // Timestamp when the relationship was created
    timestamp created_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "message_id", op: "asc"}]}
    {type: "btree", field: [{name: "file_id", op: "asc"}]}
  ]
}