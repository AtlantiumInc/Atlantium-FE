table messages {
  auth = false

  schema {
    // Unique identifier for the message
    uuid id
  
    // Reference to the thread this message belongs to
    uuid thread_id {
      table = "threads"
    }
  
    // Reference to the sender's profile
    uuid sender_id {
      table = "profiles"
    }
  
    // Content of the message
    text content filters=trim {
      sensitive = true
    }
  
    // Type of message
    enum message_type?=text {
      values = ["direct", "system", "post", "article"]
    }
  
    // Timestamp when the message was created
    timestamp created_at?=now
  
    // Timestamp when the message was last updated
    timestamp updated_at?=now
  
    // Indicates whether the message has been edited
    bool is_edited?
  
    bool is_reply?
    uuid? parent_message_id? {
      table = "messages"
    }
  
    json properties?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "thread_id", op: "asc"}]}
    {type: "btree", field: [{name: "sender_id", op: "asc"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}