// ==============================================================================
// NICK OS — VOICE COMMAND ENGINE ABSTRACTION (PREPARATION FOR NATIVE SPEECH)
// ==============================================================================

export interface VoiceCommandResult {
  success: boolean;
  actionDetected: string;
  confidence: number;
  message: string;
  parameters?: Record<string, any>;
}

export type VoiceCommandHandler = (params?: Record<string, any>) => Promise<string> | string;

export class VoiceCommandService {
  private static handlers = new Map<string, VoiceCommandHandler>();

  /**
   * Registers a callback handler for a specific semantic voice action
   */
  public static registerHandler(action: string, handler: VoiceCommandHandler) {
    this.handlers.set(action, handler);
    console.log(`[VoiceCommandService] Registered handler for action: ${action}`);
  }

  /**
   * Evaluates natural language transcript and executes the correct handler
   */
  public static async processTranscript(transcript: string): Promise<VoiceCommandResult> {
    const cleanText = transcript.toLowerCase().trim();
    console.log(`[VoiceCommandService] Processing transcript: "${cleanText}"`);

    // 1. Simple semantic matcher mapping transcripts to actions
    let actionDetected = 'UNKNOWN';
    let confidence = 0.0;
    const parameters: Record<string, any> = {};

    if (cleanText.includes("what's next") || cleanText.includes("whats next") || cleanText.includes("what is next") || cleanText.includes("upcoming")) {
      actionDetected = 'WHATS_NEXT';
      confidence = 0.95;
    } else if (cleanText.includes("start") || cleanText.includes("execute") || cleanText.includes("resume")) {
      actionDetected = 'START_ACTIVE_TASK';
      confidence = 0.90;
      // Try to extract task name if present, e.g. "start writing report"
      const matches = cleanText.match(/(?:start|execute|resume)\s+(.+)/i);
      if (matches && matches[1]) {
        parameters.taskQuery = matches[1];
      }
    } else if (cleanText.includes("pause") || cleanText.includes("hold") || cleanText.includes("stop session")) {
      actionDetected = 'PAUSE_ACTIVE_SESSION';
      confidence = 0.95;
    } else if (cleanText.includes("complete") || cleanText.includes("done") || cleanText.includes("finish")) {
      actionDetected = 'COMPLETE_ACTIVE_TASK';
      confidence = 0.95;
    } else if (cleanText.includes("blocked") || cleanText.includes("blocker") || cleanText.includes("stuck")) {
      actionDetected = 'REPORT_BLOCKER';
      confidence = 0.90;
      const matches = cleanText.match(/(?:blocked|blocker|stuck)\s+(?:by|on)?\s*(.+)/i);
      if (matches && matches[1]) {
        parameters.blockerReason = matches[1];
      }
    } else if (cleanText.includes("replan") || cleanText.includes("re-plan") || cleanText.includes("schedule update")) {
      actionDetected = 'REPLAN_DAY';
      confidence = 0.95;
    } else if (cleanText.includes("capture") || cleanText.includes("note") || cleanText.includes("remind me")) {
      actionDetected = 'QUICK_CAPTURE';
      confidence = 0.90;
      // Extract capture content, e.g. "capture idea: add Stripe billing"
      const matches = cleanText.match(/(?:capture|note|remind me)\s*(?:idea|task|note|blocker)?(?:\s+to|\s+that|\s+about)?\s*(.+)/i);
      if (matches && matches[1]) {
        parameters.captureContent = matches[1];
      }
    }

    if (actionDetected === 'UNKNOWN' || confidence < 0.6) {
      return {
        success: false,
        actionDetected,
        confidence,
        message: "Command not recognized. Try saying 'What's next?', 'Pause', 'Complete', or 'Replan my day'."
      };
    }

    // 2. Dispatch to registered application handler
    const handler = this.handlers.get(actionDetected);
    if (!handler) {
      return {
        success: true,
        actionDetected,
        confidence,
        message: `Action ${actionDetected} detected, but no operational handler has been attached yet.`,
        parameters
      };
    }

    try {
      const message = await handler(parameters);
      return {
        success: true,
        actionDetected,
        confidence,
        message,
        parameters
      };
    } catch (err: any) {
      return {
        success: false,
        actionDetected,
        confidence,
        message: `Execution failed: ${err.message || err}`,
        parameters
      };
    }
  }
}
