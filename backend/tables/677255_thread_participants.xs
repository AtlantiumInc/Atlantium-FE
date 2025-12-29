table thread_participants {
  auth = false

  schema {
    // Unique identifier for the thread participant record
    uuid id
  
    // Reference to the thread
    uuid thread_id {
      table = "threads"
    }
  
    // Reference to the participant's profile
    uuid profile_id {
      table = "profiles"
    }
  
    // Role of the participant in the thread
    enum role?=member {
      values = ["owner", "admin", "member"]
    }
  
    // Timestamp when the participant joined the thread
    timestamp joined_at?=now
  
    // Timestamp when the participant last read messages in the thread
    timestamp last_read_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "thread_id"}, {name: "profile_id"}]
    }
    {type: "btree", field: [{name: "thread_id", op: "asc"}]}
    {type: "btree", field: [{name: "profile_id", op: "asc"}]}
  ]
}