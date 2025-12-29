table objective_administrators {
  auth = false

  schema {
    // Unique identifier for the objective administrator record
    uuid id
  
    // Reference to the objective
    uuid objective_id {
      table = "objectives"
    }
  
    // Reference to the administrator's profile
    uuid profile_id {
      table = "profiles"
    }
  
    // Permission level of the administrator
    enum permission_level?=admin {
      values = ["admin", "moderator"]
    }
  
    // Timestamp when administrator permissions were granted
    timestamp granted_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "objective_id"}, {name: "profile_id"}]
    }
    {type: "btree", field: [{name: "objective_id", op: "asc"}]}
    {type: "btree", field: [{name: "profile_id", op: "asc"}]}
  ]
}