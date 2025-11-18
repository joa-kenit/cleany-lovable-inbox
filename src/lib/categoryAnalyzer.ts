export type EmailCategory = 
  | 'entrepreneurship'
  | 'technology'
  | 'lifestyle'
  | 'fitness'
  | 'finance'
  | 'marketing'
  | 'other';

export interface CategoryCounts {
  entrepreneurship: number;
  technology: number;
  lifestyle: number;
  fitness: number;
  finance: number;
  marketing: number;
  other: number;
}

export interface EmailData {
  sender: string;
  subject: string;
  snippet?: string;
}

// Keyword groups for each category
const CATEGORY_KEYWORDS: Record<Exclude<EmailCategory, 'other'>, string[]> = {
  entrepreneurship: [
    'startup', 'business', 'hustle', 'founder', 'ecommerce', 'passive',
    'productivity', 'side hustle', 'entrepreneur', 'solopreneur', 'indie',
    'build', 'launch', 'mvp', 'saas', 'bootstrapping', 'growth', 'scaling',
    'revenue', 'profit', 'agency', 'freelance', 'consulting'
  ],
  technology: [
    'ai', 'tech', 'gpt', 'coding', 'engineering', 'software', 'developer',
    'programming', 'machine learning', 'artificial intelligence', 'chatgpt',
    'openai', 'github', 'api', 'cloud', 'devops', 'frontend', 'backend',
    'fullstack', 'react', 'javascript', 'typescript', 'python', 'data science'
  ],
  lifestyle: [
    'travel', 'home', 'beauty', 'fashion', 'style', 'design', 'interior',
    'decor', 'wellness', 'mindfulness', 'meditation', 'lifestyle', 'living',
    'culture', 'art', 'photography', 'food', 'recipe', 'cooking', 'wine'
  ],
  fitness: [
    'gym', 'workout', 'health', 'protein', 'fitness', 'exercise', 'training',
    'nutrition', 'diet', 'weight', 'muscle', 'cardio', 'yoga', 'running',
    'cycling', 'strength', 'crossfit', 'bodybuilding', 'wellness', 'recovery'
  ],
  finance: [
    'investing', 'crypto', 'money', 'banking', 'finance', 'stock', 'trading',
    'portfolio', 'wealth', 'bitcoin', 'ethereum', 'blockchain', 'fintech',
    'savings', 'credit', 'debit', 'loan', 'mortgage', 'insurance', 'tax',
    'retirement', '401k', 'ira', 'dividend'
  ],
  marketing: [
    'newsletter', 'seo', 'ads', 'social media', 'marketing', 'advertising',
    'campaign', 'conversion', 'funnel', 'analytics', 'traffic', 'content',
    'email marketing', 'growth marketing', 'digital marketing', 'branding',
    'copywriting', 'affiliate', 'influencer', 'engagement', 'roi'
  ]
};

// Common newsletter/subscription patterns in sender domains
const NEWSLETTER_DOMAINS: Record<Exclude<EmailCategory, 'other'>, string[]> = {
  entrepreneurship: [
    'indiehackers', 'microconf', 'stripe', 'gumroad', 'substack',
    'entrepreneur', 'inc.com', 'fastcompany'
  ],
  technology: [
    'github', 'stackoverflow', 'hackernews', 'techcrunch', 'vercel',
    'netlify', 'aws', 'google', 'microsoft', 'apple'
  ],
  lifestyle: [
    'pinterest', 'etsy', 'wayfair', 'apartmenttherapy', 'designmilk'
  ],
  fitness: [
    'myfitnesspal', 'strava', 'peloton', 'fitbit', 'nike', 'underarmour'
  ],
  finance: [
    'coinbase', 'robinhood', 'fidelity', 'vanguard', 'schwab', 'paypal',
    'stripe', 'mint', 'creditkarma'
  ],
  marketing: [
    'mailchimp', 'convertkit', 'hubspot', 'salesforce', 'hootsuite',
    'buffer', 'semrush', 'moz', 'ahrefs'
  ]
};

/**
 * Categorizes a single email based on sender, subject, and content
 */
export function categorizeEmail(email: EmailData): EmailCategory {
  const searchText = `${email.sender} ${email.subject} ${email.snippet || ''}`.toLowerCase();
  const senderLower = email.sender.toLowerCase();
  
  // Check each category's keywords and domains
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    // Check if any keyword matches
    const hasKeywordMatch = keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
    
    // Check if sender domain matches
    const hasDomainMatch = NEWSLETTER_DOMAINS[category as Exclude<EmailCategory, 'other'>]?.some(domain =>
      senderLower.includes(domain.toLowerCase())
    );
    
    if (hasKeywordMatch || hasDomainMatch) {
      return category as EmailCategory;
    }
  }
  
  return 'other';
}

/**
 * Analyzes an array of emails and returns category counts
 */
export function analyzeInboxPersonality(emails: EmailData[]): CategoryCounts {
  const counts: CategoryCounts = {
    entrepreneurship: 0,
    technology: 0,
    lifestyle: 0,
    fitness: 0,
    finance: 0,
    marketing: 0,
    other: 0
  };
  
  emails.forEach(email => {
    const category = categorizeEmail(email);
    counts[category]++;
  });
  
  return counts;
}

/**
 * Gets the dominant personality type based on counts
 */
export function getDominantPersonality(counts: CategoryCounts): EmailCategory {
  let maxCount = 0;
  let dominant: EmailCategory = 'other';
  
  (Object.entries(counts) as [EmailCategory, number][]).forEach(([category, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominant = category;
    }
  });
  
  return dominant;
}

/**
 * Gets top N categories by count
 */
export function getTopCategories(counts: CategoryCounts, limit: number = 3): Array<{ category: EmailCategory; count: number; percentage: number }> {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  
  return (Object.entries(counts) as [EmailCategory, number][])
    .map(([category, count]) => ({
      category,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
