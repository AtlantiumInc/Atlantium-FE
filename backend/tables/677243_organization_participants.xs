table organization_participants {
  auth = false

  schema {
    // Unique identifier for the organization participant record
    uuid id
  
    // Reference to the organization
    uuid organization_id {
      table = "organizations"
    }
  
    // Reference to the participant's profile
    uuid profile_id {
      table = "profiles"
    }
  
    // Role of the participant in the organization
    enum role?=member {
      values = ["owner", "admin", "member"]
    }
  
    // Status of the participant in the organization
    enum status?=active {
      values = ["active", "inactive", "pending"]
    }
  
    // Timestamp when the participant joined the organization
    timestamp joined_at?=now
  
    // Timestamp when the participant left the organization
    timestamp left_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "organization_id"}, {name: "profile_id"}]
    }
    {
      type : "btree"
      field: [{name: "organization_id", op: "asc"}]
    }
    {type: "btree", field: [{name: "profile_id", op: "asc"}]}
  ]
}