import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authApi } from "@/api/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface NeteaseQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NeteaseQRModal = ({ open, onOpenChange }: NeteaseQRModalProps) => {
  const [qrImage, setQrImage] = useState<string>("");
  const [qrKey, setQrKey] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "ready" | "scanning" | "success" | "error">("loading");
  const { toast } = useToast();
  const { refetchAuth } = useAuth();

  useEffect(() => {
    if (open) {
      generateQR();
    }
  }, [open]);

  useEffect(() => {
    if (qrKey && status === "ready") {
      const interval = setInterval(async () => {
        try {
          const response = await authApi.checkNeteaseQRStatus(qrKey);

          if (response.status === "SUCCESS") {
            setStatus("success");
            clearInterval(interval);
            toast({
              title: "Success",
              description: "NetEase Music connected successfully",
            });
            refetchAuth();
            setTimeout(() => onOpenChange(false), 1500);
          } else if (response.status === "SCANNING") {
            setStatus("scanning");
          }
        } catch (error) {
          console.error("Error checking QR status:", error);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [qrKey, status]);

  const generateQR = async () => {
    try {
      setStatus("loading");
      const response = await authApi.generateNeteaseQR();
      setQrImage(response.qrImage);
      setQrKey(response.qrKey);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

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

          {status === "ready" && qrImage && (
            <>
              <img src={qrImage} alt="NetEase QR Code" className="w-64 h-64" />
              <p className="text-sm text-gray-600">Waiting for scan...</p>
            </>
          )}

          {status === "scanning" && qrImage && (
            <>
              <img src={qrImage} alt="NetEase QR Code" className="w-64 h-64" />
              <p className="text-sm text-green-600 font-medium">QR code scanned! Waiting for confirmation...</p>
            </>
          )}

          {status === "success" && (
            <div className="w-64 h-64 flex items-center justify-center bg-green-50 rounded">
              <p className="text-green-600 font-medium">✓ Connected successfully!</p>
            </div>
          )}

          {status === "error" && (
            <div className="w-64 h-64 flex flex-col items-center justify-center gap-4">
              <p className="text-red-600">Failed to generate QR code</p>
              <Button onClick={generateQR}>Try Again</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NeteaseQRModal;
