table runs {
  auth = false

  schema {
    // Unique identifier for the run
    uuid id
  
    // Reference to the job this run belongs to
    uuid job_id {
      table = "jobs"
    }
  
    // Current status of the run
    enum status?=pending {
      values = ["pending", "running", "completed", "failed"]
    }
  
    // Timestamp when the run started
    timestamp started_at?
  
    // Timestamp when the run completed
    timestamp completed_at?
  
    // Error message if the run failed
    text error_message? filters=trim {
      sensitive = true
    }
  
    // Number of items processed during the run
    int items_processed? filters=min:0
  
    // Timestamp when the run was created
    timestamp created_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "job_id", op: "asc"}]}
    {type: "btree", field: [{name: "status", op: "asc"}]}
    {type: "btree", field: [{name: "started_at", op: "desc"}]}
  ]
}