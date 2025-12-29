table jobs {
  auth = false

  schema {
    // Unique identifier for the job
    uuid id
  
    // Reference to the profile that owns this job
    uuid owner_id {
      table = "profiles"
    }
  
    // Type of job to be executed
    enum job_type {
      values = ["data_sync", "notification", "report_generation"]
    }
  
    // Configuration settings for the job
    json config?
  
    // Cron expression or schedule for the job
    text schedule? filters=trim
  
    // Current status of the job
    enum status?=active {
      values = ["active", "paused", "completed"]
    }
  
    // Timestamp when the job was created
    timestamp created_at?=now
  
    // Timestamp when the job was last updated
    timestamp updated_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "owner_id", op: "asc"}]}
    {type: "btree", field: [{name: "status", op: "asc"}]}
  ]
}