table objective_step_user_status {
  auth = false

  schema {
    // Unique identifier for the step user status record
    uuid id
  
    // Reference to the objective step
    uuid objective_step_id {
      table = "objective_steps"
    }
  
    // Reference to the user's profile
    uuid profile_id {
      table = "profiles"
    }
  
    // Status of the step for this user
    enum status?="not_started" {
      values = ["not_started", "in_progress", "completed", "skipped"]
    }
  
    // Progress percentage (0-100) of the user on this step
    int progress_percent? filters=min:0|max:100
  
    // Timestamp when the user started the step
    timestamp started_at?
  
    // Timestamp when the user completed the step
    timestamp completed_at?
  
    // Timestamp when the status was last updated
    timestamp updated_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "objective_step_id"}, {name: "profile_id"}]
    }
    {
      type : "btree"
      field: [{name: "objective_step_id", op: "asc"}]
    }
    {type: "btree", field: [{name: "profile_id", op: "asc"}]}
    {type: "btree", field: [{name: "status", op: "asc"}]}
  ]
}