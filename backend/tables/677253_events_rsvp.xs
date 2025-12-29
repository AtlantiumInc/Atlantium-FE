table events_rsvp {
  auth = false

  schema {
    // Unique identifier for the RSVP record
    uuid id
  
    // Reference to the event
    uuid event_id {
      table = "events"
    }
  
    // Reference to the participant's profile
    uuid profile_id {
      table = "profiles"
    }
  
    // RSVP status of the participant
    enum status?=pending {
      values = ["pending", "going", "not_going", "maybe"]
    }
  
    // Indicates whether the participant has checked in to the event
    bool checked_in?
  
    // Timestamp when the RSVP was created
    timestamp rsvp_at?=now
  
    // Timestamp when the participant checked in
    timestamp checked_in_at?
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {
      type : "btree|unique"
      field: [{name: "event_id"}, {name: "profile_id"}]
    }
    {type: "btree", field: [{name: "event_id", op: "asc"}]}
    {type: "btree", field: [{name: "profile_id", op: "asc"}]}
    {type: "btree", field: [{name: "status", op: "asc"}]}
  ]
}