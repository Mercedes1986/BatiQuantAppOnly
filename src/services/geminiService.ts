// src/services/aiService.ts
import { CalculatorType } from "../types";

// Service IA désactivé pour version 100% statique/locale.
// Stub conservé pour éviter les erreurs d'import.

export const getAIAdvice = async (
  _type: CalculatorType,
  _data: any,
  _apiKey?: string
): Promise<string> => {
  return "Le service d'assistance IA est désactivé dans cette version.";
};