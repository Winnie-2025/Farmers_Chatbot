import { HfInference } from '@huggingface/inference';

// Initialize Hugging Face client
const hf = new HfInference(import.meta.env.VITE_HUGGINGFACE_API_KEY);

export interface LlamaResponse {
  text: string;
  confidence: number;
  category: string;
}

export class LlamaService {
  private static instance: LlamaService;
  private isAvailable: boolean = false;
  private apiKey: string | null = null;

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
      // Check if API key is available
      this.apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
      this.isAvailable = !!(this.apiKey && this.apiKey !== 'your_huggingface_api_key_here' && this.apiKey.length > 10);
      
      if (!this.isAvailable) {
        console.warn('Llama service disabled: VITE_HUGGINGFACE_API_KEY not configured properly');
      } else {
        console.log('Llama service enabled with smart AI responses');
      }
    } catch (error) {
      console.warn('Llama service not available:', error);
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
      throw new Error('Llama service not available');
    }

    try {
      // Create a farming-specific prompt
      const systemPrompt = this.createSystemPrompt(context);
      const fullPrompt = `${systemPrompt}\n\nHuman: ${userMessage}\n\nAssistant:`;

      // Use Llama model for text generation with better parameters
      const response = await hf.textGeneration({
        model: 'microsoft/DialoGPT-medium',
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.8,
          top_p: 0.95,
          repetition_penalty: 1.1,
          return_full_text: false,
          do_sample: true,
        },
      });

      // Extract and clean the response
      const generatedText = response.generated_text?.trim() || '';
      
      if (!generatedText) {
        throw new Error('Empty response from AI model');
      }
      
      return {
        text: this.formatResponse(generatedText, userMessage),
        confidence: 0.9,
        category: this.detectCategory(userMessage),
      };
    } catch (error) {
      console.error('Llama generation error:', error);
      
      // Try alternative model if primary fails
      try {
        const fallbackResponse = await this.generateFallbackResponse(userMessage, context);
        return fallbackResponse;
      } catch (fallbackError) {
        console.error('Fallback generation also failed:', fallbackError);
        throw new Error('AI service temporarily unavailable');
      }
    }
  }

  private async generateFallbackResponse(userMessage: string, context: any): Promise<LlamaResponse> {
    // Try a simpler, more reliable model
    const response = await hf.textGeneration({
      model: 'gpt2',
      inputs: `Farming advice: ${userMessage}`,
      parameters: {
        max_new_tokens: 150,
        temperature: 0.7,
        return_full_text: false,
      },
    });

    const generatedText = response.generated_text?.trim() || '';
    
    return {
      text: this.formatResponse(generatedText, userMessage),
      confidence: 0.7,
      category: this.detectCategory(userMessage),
    };
  }

  private createSystemPrompt(context: any): string {
    return `You are AgriAssist, an expert AI agricultural assistant specializing in South African farming. You provide practical, actionable advice for farmers in a conversational and helpful manner.

Your expertise includes:
- Crop management and cultivation
- Livestock health and breeding
- Pest and disease control
- Soil management and fertilization
- Weather-based farming decisions
- Market prices and agricultural economics
- Government schemes and funding
- Sustainable farming practices

Response Guidelines:
- Provide specific, actionable advice
- Use South African context (climate, crops, markets)
- Include practical tips and recommendations
- Mention specific products, suppliers, or contacts when relevant
- Be concise but comprehensive
- Use farming terminology appropriately
- Consider local seasons and conditions
- Be encouraging and supportive
- Include relevant emojis for better readability

${context.category ? `Focus on: ${context.category}` : ''}
${context.farmData ? `Use this farm data for insights: ${JSON.stringify(context.farmData.slice(0, 3))}` : ''}

Respond as a knowledgeable farming expert would.`;
  }

  private formatResponse(text: string, userMessage: string): string {
    // Clean up the response
    let formatted = text
      .replace(/^(Assistant:|AI:|Bot:|Human:|User:)/i, '')
      .replace(/\n\n+/g, '\n\n')
      .trim();

    // Add farming-specific formatting
    if (formatted.length < 50) {
      // If response is too short, add more context
      formatted = this.expandShortResponse(formatted, userMessage);
    }

    // Add farming emojis for better readability
    formatted = this.addFarmingEmojis(formatted);

    // Ensure response is helpful and complete
    if (formatted.length < 20) {
      formatted = this.generateContextualResponse(userMessage);
    }

    return formatted;
  }

  private generateContextualResponse(userMessage: string): string {
    const category = this.detectCategory(userMessage);
    
    const contextualResponses = {
      crop: "🌱 For optimal crop management, I recommend focusing on soil preparation, proper irrigation timing, and integrated pest management. What specific crop are you working with?",
      livestock: "🐄 Livestock health is crucial for farm success. Ensure regular vaccinations, quality feed, and clean water. What type of livestock do you need help with?",
      weather: "🌦️ Weather planning is essential for farming success. Monitor forecasts closely and adjust planting schedules accordingly. What weather concerns do you have?",
      market: "💰 Market timing can significantly impact your profits. Consider value-addition and direct marketing opportunities. What crops are you looking to sell?",
      pest: "🐛 Integrated pest management combines prevention, monitoring, and targeted treatment. Early detection is key. What pest issues are you experiencing?",
      soil: "🌾 Healthy soil is the foundation of productive farming. Regular testing and organic matter addition are essential. What soil challenges are you facing?"
    };

    return contextualResponses[category as keyof typeof contextualResponses] || 
           "🌱 I'm here to help with all your farming questions! Please provide more details about your specific situation so I can give you the best advice.";
  }

  private expandShortResponse(text: string, userMessage: string): string {
    const category = this.detectCategory(userMessage);
    
    const expansions = {
      crop: "🌱 For optimal crop management, consider soil testing, proper irrigation scheduling, and integrated pest management practices.",
      livestock: "🐄 Ensure regular health checkups, proper nutrition, and maintain clean living conditions for your livestock.",
      weather: "🌦️ Monitor weather patterns closely and adjust farming activities accordingly. Consider climate-smart agriculture practices.",
      market: "💰 Stay updated with market trends and consider value-addition opportunities to maximize profits.",
      pest: "🐛 Implement integrated pest management (IPM) combining biological, cultural, and chemical controls.",
      soil: "🌾 Regular soil testing and organic matter addition are key to maintaining soil health and productivity."
    };

    return text + " " + (expansions[category as keyof typeof expansions] || "Consider consulting with local agricultural extension services for personalized advice.");
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
    if (this.apiKey === 'your_huggingface_api_key_here') return 'Placeholder value';
    if (this.apiKey.length < 10) return 'Invalid key';
    return 'Configured';
  }
}

export const llamaService = LlamaService.getInstance();