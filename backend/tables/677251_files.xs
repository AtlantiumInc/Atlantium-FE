table files {
  auth = false

  schema {
    // Unique identifier for the file
    uuid id
  
    // Reference to the profile that uploaded this file
    uuid uploader_id {
      table = "profiles"
    }
  
    // Name of the file
    text filename filters=trim
  
    // MIME type or file extension
    text file_type filters=trim
  
    // Size of the file in bytes
    int file_size filters=min:0
  
    // Storage path or URL to the file
    text storage_path filters=trim {
      sensitive = true
    }
  
    // Additional metadata about the file
    json metadata?
  
    // Timestamp when the file was uploaded
    timestamp uploaded_at?=now
  }

  index = [
    {type: "primary", field: [{name: "id"}]}
    {type: "btree", field: [{name: "uploader_id", op: "asc"}]}
    {type: "btree", field: [{name: "uploaded_at", op: "desc"}]}
  ]
}