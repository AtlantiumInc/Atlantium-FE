table events {
  auth = false

  schema {
    // Unique identifier for the event
    uuid id
  
    // Reference to the profile that created this event
    uuid creator_id {
      table = "profiles"
    }
  
    // Title of the event
    text title filters=trim
  
    // Detailed description of the event
    text description? filters=trim
  
    // Type of event
    enum event_type?=general {
      values = ["general", "meetup", "workshop", "webinar"]
    }
  
    // Start time of the event
    timestamp start_time
  
    // End time of the event
    timestamp end_time?
  
    // Physical or virtual location of the event
    text location? filters=trim
  
    // Event settings and configuration
    json settings?
  
    // Timestamp when the event was created
    timestamp created_at?=now
  
    // Timestamp when the event was last updated
    timestamp updated_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "creator_id", op: "asc"}]}
    {type: "btree", field: [{name: "start_time", op: "asc"}]}
  ]
}