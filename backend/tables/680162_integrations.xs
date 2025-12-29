table integrations {
  auth = false

  schema {
    uuid id
    timestamp created_at?=now
    enum provider? {
      values = ["github"]
    }
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "created_at", op: "desc"}]}
  ]
}