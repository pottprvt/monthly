import { toast } from "sonner";

/** Copies text and reports the outcome; the Clipboard API is missing on insecure origins. */
export async function copyText(text: string, success: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(success);
    return true;
  } catch {
    toast.error("Copying is not available here. Select the text and copy it manually.");
    return false;
  }
}
