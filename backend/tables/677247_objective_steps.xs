table objective_steps {
  auth = false

  schema {
    // Unique identifier for the objective step
    uuid id
  
    // Reference to the objective
    uuid objective_id {
      table = "objectives"
    }
  
    // Title of the step
    text title filters=trim
  
    // Detailed description of the step
    text description? filters=trim
  
    // Order index of the step within the objective
    int index filters=min:0
  
    // Type of step
    enum step_type?=task {
      values = ["task", "milestone", "checkpoint"]
    }
  
    // Timestamp when the step was created
    timestamp created_at?=now
  
    // Timestamp when the step was last updated
    timestamp updated_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "objective_id"}, {name: "index"}]
    }
    {type: "btree", field: [{name: "objective_id", op: "asc"}]}
  ]
}