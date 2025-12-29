// Get a single article by ID
query "articles/{article_id}" verb=GET {
  api_group = "application"
  auth = "users"

  input {
    // Article message ID
    uuid article_id
  }

  stack {
    // Get the article message
    db.query messages {
      where = ($db.messages.id == $input.article_id) && ($db.messages.message_type == "article")
      return = {type: "single"}
    } as $article
  
    precondition ($article != null) {
      error_type = "inputerror"
      error = "Article not found"
    }
  }

  response = {
    id        : $article.id
    thread_id : $article.thread_id
    properties: $article.properties
    created_at: $article.created_at
    updated_at: $article.updated_at
    is_edited : $article.is_edited
  }
}