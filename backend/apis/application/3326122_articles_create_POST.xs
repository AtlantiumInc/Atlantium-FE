// Create a new article in a frontier thread
query "articles/create" verb=POST {
  api_group = "application"
  auth = "users"

  input {
    // Thread ID where the article will be posted
    uuid thread_id
  
    // Article properties as JSON object
    // Expected structure: {title, summary, content, source, author, tags, key_takeaways, read_time_minutes, external_url}
    json properties
  }

  stack {
    // Verify the thread exists and is a frontier thread
    db.query threads {
      where = $db.threads.id == $input.thread_id
      return = {type: "single"}
    } as $thread
  
    precondition ($thread != null) {
      error_type = "inputerror"
      error = "Thread not found"
    }
  
    precondition ($thread.type == "frontier") {
      error_type = "inputerror"
      error = "Articles can only be posted to frontier threads"
    }
  
    // Create the article message
    db.add messages {
      data = {
        thread_id   : $input.thread_id
        content     : $input.properties.summary
        message_type: "article"
        properties  : $input.properties
        is_edited   : false
        is_reply    : false
      }
    } as $new_article
  
    // Update the thread's updated_at timestamp
    db.patch threads {
      field_name = "id"
      field_value = $input.thread_id
      data = {updated_at: now}
    }
  }

  response = {
    id        : $new_article.id
    thread_id : $new_article.thread_id
    properties: $new_article.properties
    created_at: $new_article.created_at
  }
}