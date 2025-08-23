# frozen_string_literal: true

# Search Index Generator Plugin
# Generates enhanced search index with better content extraction
Jekyll::Hooks.register :site, :post_write do |site|
  search_index = []
  
  site.posts.docs.each do |post|
    # Extract meaningful content from post
    content = post.content
    # Use Liquid strip_html filter for Jekyll 4.x compatibility
    plain_content = content.gsub(/<\/?[^>]*>/, '').gsub(/\s+/, ' ').strip
    excerpt = plain_content.length > 300 ? "#{plain_content[0..300]}..." : plain_content
    
    # Extract headings for better search
    headings = content.scan(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i).flatten.map(&:strip)
    
    search_index << {
      'title' => post.data['title'],
      'url' => post.url,
      'date' => post.date.iso8601,
      'categories' => post.data['categories'] || [],
      'tags' => post.data['tags'] || [],
      'content' => excerpt,
      'headings' => headings,
      'author' => post.data['author'] || site.config['social']['name'],
      'description' => post.data['description'] || excerpt,
      'word_count' => plain_content.split.length
    }
  end
  
  # Write enhanced search index
  search_path = File.join(site.dest, 'assets', 'js', 'data', 'search-enhanced.json')
  FileUtils.mkdir_p(File.dirname(search_path))
  File.write(search_path, JSON.pretty_generate(search_index))
  
  Jekyll.logger.info "Search Index:", "Generated enhanced search index with #{search_index.length} posts"
end
