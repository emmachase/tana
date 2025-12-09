import { useTRPC } from "~/lib/trpc";
import type { Route } from "./+types/token";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { Copy, Download, Key } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Upload Token - tana" },
    { name: "description", content: "Generate upload tokens for tana" },
  ];
}

export default function Token() {
  const trpc = useTRPC();
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const { mutate, isPending } = useMutation(
    trpc.token.mutationOptions({
      onSuccess: (data) => {
        setGeneratedToken(data.token);
        toast.success("Upload token generated successfully!");
      },
      onError: (error) => {
        console.error("Token generation failed:", error);
        toast.error("Failed to generate token");
      },
    }),
  );

  const handleGenerateToken = () => {
    mutate();
  };

  const handleCopyToken = async () => {
    if (generatedToken) {
      await navigator.clipboard.writeText(generatedToken);
      toast.success("Token copied to clipboard!");
    }
  };

  const handleDownloadShareX = () => {
    if (!generatedToken) return;

    // Get the current origin for the ShareX config
    const origin = window.location.origin;

    // Create ShareX config
    const sharexConfig = {
      Version: "15.0.0",
      Name: "tana",
      DestinationType: "ImageUploader, FileUploader",
      RequestMethod: "POST",
      RequestURL: `${origin}/api/trpc/upload`,
      Headers: {
        Authorization: `Bearer ${generatedToken}`,
      },
      Body: "MultipartFormData",
      FileFormName: "file",
      URL: "{json:result.data.url}",
    };

    // Create blob and download
    const blob = new Blob([JSON.stringify(sharexConfig, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tana.sxcu";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("ShareX config downloaded!");
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-6 w-6" />
            Upload Token Generator
          </CardTitle>
          <CardDescription>
            Generate a permanent upload token for use with ShareX or other
            upload tools. This token will have full access to upload files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button
              onClick={handleGenerateToken}
              disabled={isPending}
              className="w-full"
              size="lg"
            >
              {isPending ? "Generating..." : "Generate New Token"}
            </Button>

            {generatedToken && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Token</label>
                  <div className="flex gap-2">
                    <Input
                      value={generatedToken}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyToken}
                      title="Copy token"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Keep this token secure. Anyone with this token can upload
                    files to your instance.
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="mb-2 text-sm font-medium">
                    ShareX Integration
                  </h3>
                  <p className="text-muted-foreground mb-4 text-sm">
                    Download the ShareX configuration file (.sxcu) to easily set
                    up uploading from ShareX.
                  </p>
                  <Button
                    onClick={handleDownloadShareX}
                    variant="secondary"
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download ShareX Config
                  </Button>
                </div>
              </div>
            )}
          </div>

          {!generatedToken && (
            <div className="bg-muted rounded-lg p-4">
              <h3 className="mb-2 text-sm font-medium">What is this?</h3>
              <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                <li>Generate a permanent upload token for API access</li>
                <li>Use with ShareX for quick screenshot uploads</li>
                <li>Token never expires unless regenerated</li>
                <li>Each new token invalidates the previous one</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
