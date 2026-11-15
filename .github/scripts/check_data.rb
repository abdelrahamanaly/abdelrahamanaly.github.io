# Checks the YAML files in _data/ before a pull request can be merged.
#
# Run it locally from the repository root:   ruby .github/scripts/check_data.rb
# Each problem is printed with its file and line. On GitHub it also shows up
# next to the line in the pull request ("Files changed" tab).
#
# The rules live in SCHEMA below: for each file, the keys every entry must have.
# When you add a new kind of data file, add a line for it there.
require "psych"
Encoding.default_external = Encoding::UTF_8

# A value from the YAML file, remembering which line it came from.
V = Struct.new(:val, :line)

def wrap(node)
  case node
  when Psych::Nodes::Document then wrap(node.root)
  when Psych::Nodes::Mapping
    h = {}
    node.children.each_slice(2) { |k, v| h[k.value] = wrap(v) }
    V.new(h, node.start_line + 1)
  when Psych::Nodes::Sequence then V.new(node.children.map { |c| wrap(c) }, node.start_line + 1)
  when Psych::Nodes::Scalar then V.new(node.to_ruby, node.start_line + 1)
  when nil then V.new(nil, 1)
  else V.new(nil, node.start_line + 1)
  end
end

$problems = 0
def problem(file, line, msg)
  $problems += 1
  if ENV["GITHUB_ACTIONS"]
    puts "::error file=#{file},line=#{line},title=Data check::#{msg}"
  else
    puts "#{file}:#{line}: #{msg}"
  end
end

STOPS = File.read("brussels/index.html").scan(/class="num">(\d+)</).flatten.map(&:to_i)
LINK_KEYS = %w[url scholar github linkedin website]

# Required keys. "places: [...]" means: a list, and each entry needs these keys.
SCHEMA = {
  "experience.yml"   => { list: %w[title org dates summary] },
  "highlights.yml"   => { list: %w[title where text] },
  "publications.yml" => { list: %w[year title authors venue url] },
  "resources.yml"    => { list: %w[step title items], nested: { "items" => %w[title kind url] } },
  "stack.yml"        => { list: %w[layer what tools], nested: { "tools" => %w[name] } },
  "skills.yml"       => { list: %w[group items] },
  "food.yml"         => { list: %w[course], nested: { "places" => %w[name note] } },
  "piglet.yml"       => { keys: %w[circus kitchen] },
  "profile.yml"      => { keys: %w[name title links about contact] },
  "about.yml"        => { keys: %w[education community languages] },
}

def blank?(v)
  v.nil? || v.val.nil? || (v.val.respond_to?(:empty?) && v.val.empty?)
end

def need(file, entry, keys, what)
  keys.each do |k|
    next unless blank?(entry.val[k])
    problem(file, entry.line, "#{what} is missing \"#{k}:\" (or it is empty)")
  end
end

$warnings = 0
def warning(file, line, msg)
  $warnings += 1
  if ENV["GITHUB_ACTIONS"]
    puts "::warning file=#{file},line=#{line},title=Data check::#{msg}"
  else
    puts "#{file}:#{line}: warning: #{msg}"
  end
end

# Every link anywhere in a file. Relative links such as "brussels/" are fine.
# A web address without https:// is an error (it would open as a page on this site).
# http:// is only a warning: a few sites, like the conference ranking, have no https.
def check_link(file, v)
  s = v.val
  return unless s.is_a?(String)
  if s.start_with?("http://")
    warning(file, v.line, "this link is not secure (http://); use https:// if the site supports it: #{s}")
  elsif s =~ /\A(www\.)?[\w-]+(\.[\w-]+)+(\/|\z)/ && !s.include?("://") && !s.include?("@")
    problem(file, v.line, "this link needs https:// in front, otherwise it opens as a page on this site: #{s}")
  end
end

def links(file, v)
  case v.val
  when Hash
    v.val.each { |k, c| LINK_KEYS.include?(k) ? check_link(file, c) : links(file, c) }
  when Array then v.val.each { |c| links(file, c) }
  when String
    check_link(file, v) if v.val.start_with?("http://")
  end
end

Dir["_data/*.yml"].sort.each do |path|
  name = File.basename(path)
  begin
    doc = wrap(Psych.parse_file(path))
  rescue Psych::SyntaxError => e
    problem(path, e.line, "this is not valid YAML: #{e.problem}. Check the indentation (spaces, not tabs), and wrap text containing \": \" in quotes")
    next
  end
  links(path, doc)
  rule = SCHEMA[name] or next

  if rule[:keys]
    if doc.val.is_a?(Hash) then need(path, doc, rule[:keys], "This file")
    else problem(path, doc.line, "this file should be a set of \"key: value\" lines") end
  end
  # Piglet's page: acts need a title and a level of 1-3, builds_on must name
  # another act, and kitchen tips need a title and a tip.
  if name == "piglet.yml" && doc.val.is_a?(Hash)
    acts = doc.val["circus"]&.val.is_a?(Hash) ? (doc.val["circus"].val["acts"]&.val || []) : []
    acts = [] unless acts.is_a?(Array)
    titles = acts.map { |a| a.val.is_a?(Hash) && a.val["title"] ? a.val["title"].val : nil }.compact
    acts.each do |a|
      next problem(path, a.line, "each act should be a block of \"key: value\" lines") unless a.val.is_a?(Hash)
      need(path, a, %w[title], "This act")
      lv = a.val["level"]
      problem(path, lv.line, "level should be 1, 2 or 3 (got #{lv.val})") if lv && !lv.val.nil? && ![1, 2, 3].include?(lv.val)
      b = a.val["builds_on"]
      if b && !b.val.nil? && !titles.include?(b.val)
        problem(path, b.line, "builds_on: \"#{b.val}\" is not the title of any act; it must match exactly")
      end
    end
    tips = doc.val["kitchen"]&.val.is_a?(Hash) ? (doc.val["kitchen"].val["tips"]&.val || []) : []
    (tips.is_a?(Array) ? tips : []).each do |t|
      t.val.is_a?(Hash) ? need(path, t, %w[title tip], "This tip") : problem(path, t.line, "each tip should be a block of \"key: value\" lines")
    end
  end

  next unless rule[:list]
  unless doc.val.is_a?(Array)
    problem(path, doc.line, "this file should be a list, each entry starting with \"- \"") unless blank?(doc)
    next
  end
  doc.val.each_with_index do |entry, i|
    unless entry.val.is_a?(Hash)
      problem(path, entry.line, "entry #{i + 1} should be a block of \"key: value\" lines")
      next
    end
    need(path, entry, rule[:list], "This entry")
    (rule[:nested] || {}).each do |list_key, keys|
      sub = entry.val[list_key]
      next if sub.nil?
      unless sub.val.is_a?(Array)
        problem(path, sub.line, "\"#{list_key}:\" should be a list, each item starting with \"- \"")
        next
      end
      sub.val.each { |item| item.val.is_a?(Hash) ? need(path, item, keys, "This item") : problem(path, item.line, "this item should be a block of \"key: value\" lines") }
    end
  end

  # Food menu extras: a course needs places or "soon:", and stops must exist on the tour.
  next unless name == "food.yml"
  doc.val.each do |course|
    next unless course.val.is_a?(Hash)
    if blank?(course.val["places"]) && blank?(course.val["soon"])
      problem(path, course.line, "this course has no \"places:\"; add some, or a \"soon:\" line to show it as coming")
    end
    (course.val["places"]&.val || []).each do |place|
      next unless place.val.is_a?(Hash) && place.val["stop"]
      s = place.val["stop"]
      unless s.val.is_a?(Integer) && STOPS.include?(s.val)
        problem(path, s.line, "stop #{s.val} does not exist; the tour has stops #{STOPS.min} to #{STOPS.max}")
      end
    end
  end
end

if $problems.zero?
  puts "All data files look good (#{Dir['_data/*.yml'].size} files checked#{", #{$warnings} warning(s)" if $warnings > 0})."
else
  puts "#{$problems} problem(s) found."
  exit 1
end
