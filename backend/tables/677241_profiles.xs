table profiles {
  auth = false

  schema {
    // Unique identifier for the profile
    uuid id
  
    // Reference to the user account
    uuid user_id {
      table = "users"
    }
  
    // Unique username for the profile
    text username filters=trim
  
    // Display name shown to other users
    text display_name filters=trim
  
    // User's first name
    text first_name? filters=trim
  
    // User's last name
    text last_name? filters=trim
  
    // User biography or description
    text bio? filters=trim
  
    // URL to the user's avatar image
    text avatar_url? filters=trim
  
    // User's location
    text location? filters=trim
  
    // User's personal website URL
    text website_url? filters=trim
  
    // Timestamp when the profile was created
    timestamp created_at?=now
  
    // Timestamp when the profile was last updated
    timestamp updated_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree|unique", field: [{name: "user_id", op: "asc"}]}
    {
      type : "btree|unique"
      field: [{name: "username", op: "asc"}]
    }
  ]
}