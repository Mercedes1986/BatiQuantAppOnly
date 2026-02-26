
// Service IA désactivé pour version 100% statique/locale.
// Ce fichier est conservé comme stub pour éviter les erreurs d'import, mais n'a plus de dépendances.

import { CalculatorType } from "../types";

export const getAIAdvice = async (
  type: CalculatorType,
  data: any,
  apiKey: string
): Promise<string> => {
  return "Le service d'assistance IA est désactivé dans cette version.";
};
