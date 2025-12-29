table objective_participants {
  auth = false

  schema {
    // Unique identifier for the objective participant record
    uuid id
  
    // Reference to the objective
    uuid objective_id {
      table = "objectives"
    }
  
    // Reference to the participant's profile
    uuid profile_id {
      table = "profiles"
    }
  
    // Role of the participant in the objective
    enum role?=participant {
      values = ["participant", "viewer"]
    }
  
    // Status of the participant in the objective
    enum status?=active {
      values = ["active", "inactive", "pending", "completed"]
    }
  
    // Timestamp when the participant joined the objective
    timestamp joined_at?=now
  
    // Timestamp when the participant completed the objective
    timestamp completed_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "objective_id"}, {name: "profile_id"}]
    }
    {type: "btree", field: [{name: "objective_id", op: "asc"}]}
    {type: "btree", field: [{name: "profile_id", op: "asc"}]}
    {type: "btree", field: [{name: "status", op: "asc"}]}
  ]
}