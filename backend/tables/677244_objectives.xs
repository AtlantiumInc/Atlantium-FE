table objectives {
  auth = false

  schema {
    // Unique identifier for the objective
    uuid id
  
    // Reference to the profile that owns this objective
    uuid profile_owner_id {
      table = "profiles"
    }
  
    // Title of the objective
    text title filters=trim
  
    // Detailed description of the objective
    text description? filters=trim
  
    // URL-friendly unique identifier for the objective
    text slug filters=trim
  
    // Visibility level of the objective
    enum visibility?=private {
      values = ["private", "public", "unlisted"]
    }
  
    // Current status of the objective
    enum status?=draft {
      values = ["draft", "active", "completed", "archived"]
    }
  
    // Tags associated with the objective for categorization
    json tags?
  
    // Objective settings and configuration
    json settings?
  
    // Timestamp when the objective was created
    timestamp created_at?=now
  
    // Timestamp when the objective was last updated
    timestamp updated_at?=now
  
    enum owner_type? {
      values = ["profile", "organization"]
    }
  
    uuid? organization_owner_id? {
      table = "organizations"
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "slug", op: "asc"}]}
    {type: "btree", field: [{name: "status", op: "asc"}]}
  ]
}