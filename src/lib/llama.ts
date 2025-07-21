// OpenAI-compatible API service for smart farming responses
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface LlamaResponse {
  text: string;
  confidence: number;
  category: string;
}

export class LlamaService {
  private static instance: LlamaService;
  private isAvailable: boolean = false;
  private apiKey: string | null = null;
  private baseUrl: string = 'https://api.openai.com/v1';

  private constructor() {
    this.checkAvailability();
  }

  public static getInstance(): LlamaService {
    if (!LlamaService.instance) {
      LlamaService.instance = new LlamaService();
    }
    return LlamaService.instance;
  }

  private async checkAvailability(): Promise<void> {
    try {
      // Check for OpenAI API key first
      this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!this.apiKey || this.apiKey === 'your_openai_api_key_here' || this.apiKey.length < 10) {
        // Try alternative providers
        const altKey = import.meta.env.VITE_AI_API_KEY;
        const altUrl = import.meta.env.VITE_AI_BASE_URL;
        
        if (altKey && altKey !== 'your_ai_api_key_here' && altKey.length > 10) {
          this.apiKey = altKey;
          this.baseUrl = altUrl || 'https://api.together.xyz/v1'; // Together AI as fallback
          this.isAvailable = true;
          console.log('🤖 AI service enabled with alternative provider');
          return;
        }
        
        console.warn('AI service disabled: No valid API key found');
        this.isAvailable = false;
        return;
      }
      
      this.isAvailable = true;
      console.log('🤖 AI service enabled with OpenAI-compatible API');
    } catch (error) {
      console.warn('AI service not available:', error);
      this.isAvailable = false;
    }
  }

  public async generateResponse(
    userMessage: string,
    context: {
      category?: string;
      farmData?: any[];
      userPreferences?: any;
    } = {}
  ): Promise<LlamaResponse> {
    if (!this.isAvailable) {
      throw new Error('AI service not available');
    }

    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: this.createSystemPrompt(context)
        },
        {
          role: 'user',
          content: userMessage
        }
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.getModelName(),
          messages: messages,
          max_tokens: 300,
          temperature: 0.7,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API Error:', response.status, errorText);
        throw new Error(`AI API request failed: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      const generatedText = data.choices[0]?.message?.content?.trim();
      
      if (!generatedText) {
        throw new Error('Empty response from AI model');
      }
      
      return {
        text: this.formatResponse(generatedText, userMessage),
        confidence: 0.9,
        category: this.detectCategory(userMessage),
      };
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error('AI service temporarily unavailable');
    }
  }

  private getModelName(): string {
    // Use different models based on the provider
    if (this.baseUrl.includes('openai.com')) {
      return 'gpt-3.5-turbo';
    } else if (this.baseUrl.includes('together.xyz')) {
      return 'meta-llama/Llama-2-7b-chat-hf';
    } else if (this.baseUrl.includes('groq.com')) {
      return 'llama2-70b-4096';
    }
    return 'gpt-3.5-turbo'; // Default fallback
  }

  private createSystemPrompt(context: any): string {
    return `You are AgriAssist, an expert AI agricultural assistant specializing in South African farming. You provide practical, actionable advice for farmers in a conversational and helpful manner.

Your expertise includes:
- Crop management and cultivation (maize, wheat, tomatoes, potatoes, etc.)
- Livestock health and breeding (cattle, sheep, goats, chickens)
- Pest and disease control using IPM approaches
- Soil management and fertilization for South African conditions
- Weather-based farming decisions and climate adaptation
- Market prices and agricultural economics in South Africa
- Government schemes and funding opportunities
- Sustainable farming practices and water conservation

Response Guidelines:
- Provide specific, actionable advice tailored to South African conditions
- Use local context (climate zones, seasonal patterns, local suppliers)
- Include practical tips with specific measurements and timings
- Mention relevant products, suppliers, or contacts when helpful
- Be concise but comprehensive (aim for 150-250 words)
- Use appropriate farming terminology
- Consider local seasons (summer: Dec-Feb, winter: Jun-Aug)
- Be encouraging and supportive
- Include relevant emojis for better readability
- Focus on cost-effective solutions for small to medium farmers

${context.category ? `Primary focus area: ${context.category}` : ''}
${context.farmData ? `Reference data available from similar farms` : ''}

Always respond as a knowledgeable South African farming expert would, with practical solutions that farmers can implement immediately.`;
  }

  private formatResponse(text: string, userMessage: string): string {
    // Clean up the response
    let formatted = text
      .replace(/^(Assistant:|AI:|Bot:|Human:|User:)/i, '')
      .replace(/\n\n+/g, '\n\n')
      .trim();

    // Ensure minimum length and quality
    if (formatted.length < 50) {
      formatted = this.expandShortResponse(formatted, userMessage);
    }

    // Add farming emojis for better readability
    formatted = this.addFarmingEmojis(formatted);

    return formatted;
  }

  private expandShortResponse(text: string, userMessage: string): string {
    const category = this.detectCategory(userMessage);
    
    const expansions = {
      crop: "🌱 For optimal crop management, consider soil testing, proper irrigation scheduling, and integrated pest management practices. Monitor your crops regularly for early problem detection.",
      livestock: "🐄 Ensure regular health checkups, proper nutrition, and maintain clean living conditions for your livestock. Prevention is always better than treatment.",
      weather: "🌦️ Monitor weather patterns closely and adjust farming activities accordingly. Consider climate-smart agriculture practices to build resilience.",
      market: "💰 Stay updated with market trends and consider value-addition opportunities to maximize profits. Direct marketing can often yield better prices.",
      pest: "🐛 Implement integrated pest management (IPM) combining biological, cultural, and chemical controls. Early detection and prevention are key.",
      soil: "🌾 Regular soil testing and organic matter addition are essential for maintaining soil health and productivity. Healthy soil equals healthy crops."
    };

    return text + " " + (expansions[category as keyof typeof expansions] || "Consider consulting with local agricultural extension services for personalized advice specific to your area.");
  }

  private addFarmingEmojis(text: string): string {
    return text
      .replace(/\b(maize|corn)\b/gi, '🌽 $1')
      .replace(/\b(tomato|tomatoes)\b/gi, '🍅 $1')
      .replace(/\b(potato|potatoes)\b/gi, '🥔 $1')
      .replace(/\b(wheat)\b/gi, '🌾 $1')
      .replace(/\b(cattle|cow|cows)\b/gi, '🐄 $1')
      .replace(/\b(chicken|chickens|poultry)\b/gi, '🐔 $1')
      .replace(/\b(sheep)\b/gi, '🐑 $1')
      .replace(/\b(water|irrigation)\b/gi, '💧 $1')
      .replace(/\b(fertilizer|nutrients)\b/gi, '🌿 $1')
      .replace(/\b(harvest|harvesting)\b/gi, '🌾 $1');
  }

  private detectCategory(message: string): string {
    const keywords = {
      crop: ['crop', 'plant', 'seed', 'harvest', 'grow', 'maize', 'wheat', 'tomato', 'potato', 'vegetable', 'fruit', 'planting', 'growing'],
      livestock: ['cattle', 'cow', 'sheep', 'goat', 'chicken', 'livestock', 'animal', 'pig', 'poultry', 'breeding', 'feeding'],
      pest: ['pest', 'disease', 'insect', 'bug', 'fungus', 'rot', 'blight', 'aphid', 'worm', 'virus', 'infection'],
      weather: ['weather', 'rain', 'drought', 'temperature', 'climate', 'frost', 'wind', 'storm', 'season'],
      market: ['price', 'market', 'sell', 'buy', 'profit', 'cost', 'demand', 'supply', 'export', 'income'],
      soil: ['soil', 'fertilizer', 'compost', 'nutrients', 'ph', 'organic', 'nitrogen', 'phosphorus', 'potassium'],
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => lowerMessage.includes(word))) {
        return category;
      }
    }
    
    return 'general';
  }

  public isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  public getApiKeyStatus(): string {
    if (!this.apiKey) return 'Not configured';
    if (this.apiKey.includes('your_') && this.apiKey.includes('_key_here')) return 'Placeholder value';
    if (this.apiKey.length < 10) return 'Invalid key';
    return `Configured (${this.baseUrl.includes('openai') ? 'OpenAI' : 'Alternative Provider'})`;
  }

  public getProviderInfo(): string {
    if (this.baseUrl.includes('openai.com')) return 'OpenAI GPT-3.5';
    if (this.baseUrl.includes('together.xyz')) return 'Together AI (Llama-2)';
    if (this.baseUrl.includes('groq.com')) return 'Groq (Llama-2)';
    return 'Custom Provider';
  }
}

export const llamaService = LlamaService.getInstance();