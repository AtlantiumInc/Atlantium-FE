table threads {
  auth = false

  schema {
    // Unique identifier for the thread
    uuid id
  
    // Type of messaging thread
    enum type?=direct {
      values = ["direct", "group", "event_chat", "frontier"]
    }
  
    // Name of the thread (optional for direct messages)
    text name? filters=trim
  
    // Reference to the profile that created this thread
    uuid created_by {
      table = "profiles"
    }
  
    // Reference to an event if this is an event chat
    uuid event_id? {
      table = "events"
    }
  
    // Timestamp when the thread was created
    timestamp created_at?=now
  
    // Timestamp when the thread was last updated
    timestamp updated_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_by", op: "asc"}]}
    {type: "btree", field: [{name: "event_id", op: "asc"}]}
  ]
}