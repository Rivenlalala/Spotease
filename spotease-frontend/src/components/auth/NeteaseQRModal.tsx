import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { authApi } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface NeteaseQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NeteaseQRModal = ({ open, onOpenChange }: NeteaseQRModalProps) => {
  const [qrUrl, setQrUrl] = useState<string>("");
  const [qrKey, setQrKey] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "ready" | "scanning" | "success" | "error">("loading");
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCookie, setManualCookie] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { refetchAuth } = useAuth();

  const generateQR = async () => {
    try {
      setStatus("loading");
      const response = await authApi.generateNeteaseQR();
      setQrUrl(response.qrUrl);
      setQrKey(response.qrKey);
      setStatus("ready");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      setStatus("error");
      setShowManualInput(true); // Auto-expand manual input on QR failure
      toast({
        title: "Error",
        description: "Failed to generate QR code. You can enter your cookie manually below.",
        variant: "destructive",
      });
    }
  };

  const handleManualSubmit = async () => {
    if (!manualCookie.trim()) {
      toast({
        title: "Error",
        description: "Please enter your NetEase cookie",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await authApi.submitNeteaseCookie(manualCookie);
      setStatus("success");
      toast({
        title: "Success",
        description: "NetEase Music connected successfully",
      });
      refetchAuth();
      setTimeout(() => onOpenChange(false), 1500);
    } catch (error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      const errorMessage = axiosError.response?.data?.error || "Failed to save cookie. Please check and try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (open) {
      generateQR();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    // Only poll when modal is open and QR is ready/scanning
    if (!open || !qrKey || (status !== "ready" && status !== "scanning")) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await authApi.checkNeteaseQRStatus(qrKey);

        if (response.status === "SUCCESS") {
          setStatus("success");
          toast({
            title: "Success",
            description: "NetEase Music connected successfully",
          });
          refetchAuth();
          setTimeout(() => onOpenChange(false), 1500);
        } else if (response.status === "SCANNED") {
          setStatus("scanning");
        }
      } catch (error) {
        console.error("Error checking QR status:", error);
      }
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, qrKey, status]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect NetEase Music</DialogTitle>
          <DialogDescription>
            Scan the QR code with your NetEase Music mobile app
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {status === "loading" && (
            <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
              <p className="text-gray-500">Generating QR code...</p>
            </div>
          )}

          {status === "ready" && qrUrl && (
            <>
              <QRCodeSVG value={qrUrl} size={256} />
              <p className="text-sm text-gray-600">Waiting for scan...</p>
            </>
          )}

          {status === "scanning" && qrUrl && (
            <>
              <QRCodeSVG value={qrUrl} size={256} />
              <p className="text-sm text-green-600 font-medium">QR code scanned! Waiting for confirmation...</p>
            </>
          )}

          {status === "success" && (
            <div className="w-64 h-64 flex items-center justify-center bg-green-50 rounded">
              <p className="text-green-600 font-medium">✓ Connected successfully!</p>
            </div>
          )}

          {status === "error" && (
            <div className="w-64 flex flex-col items-center justify-center gap-4">
              <p className="text-red-600">Failed to generate QR code</p>
              <Button onClick={generateQR} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          )}

          {/* Manual Cookie Input Section */}
          {status !== "success" && (
            <div className="w-full border-t pt-4 mt-4">
              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                {showManualInput ? "▼" : "▶"} Having trouble? Enter cookie manually
              </button>

              {showManualInput && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-gray-500">
                    1. Log into music.163.com in your browser<br />
                    2. Open DevTools (F12) → Application → Cookies<br />
                    3. Copy the entire cookie value
                  </p>
                  <Textarea
                    placeholder="Paste your NetEase cookie here..."
                    value={manualCookie}
                    onChange={(e) => setManualCookie(e.target.value)}
                    className="min-h-[80px] text-xs"
                  />
                  <Button
                    onClick={handleManualSubmit}
                    disabled={isSubmitting || !manualCookie.trim()}
                    className="w-full"
                  >
                    {isSubmitting ? "Connecting..." : "Connect with Cookie"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NeteaseQRModal;
