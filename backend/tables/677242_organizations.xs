table organizations {
  auth = false

  schema {
    // Unique identifier for the organization
    uuid id
  
    // Organization name
    text name filters=trim
  
    // URL-friendly unique identifier for the organization
    text slug filters=trim
  
    // Organization description
    text description? filters=trim
  
    // Type of organization
    enum org_type?=team {
      values = ["team", "company", "nonprofit", "club"]
    }
  
    // URL to the organization's avatar image
    text avatar_url? filters=trim
  
    // Organization settings and configuration
    json settings?
  
    // Timestamp when the organization was created
    timestamp created_at?=now
  
    // Timestamp when the organization was last updated
    timestamp updated_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "slug", op: "asc"}]}
  ]
}