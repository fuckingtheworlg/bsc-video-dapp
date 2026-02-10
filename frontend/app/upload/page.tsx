"use client";

import { useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useRouter } from "next/navigation";
import { useToken } from "@/hooks/useToken";
import { useInteraction } from "@/hooks/useInteraction";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Upload as UploadIcon, Flame, FileVideo, Image as ImageIcon, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function UploadPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { burnPermitCount, balance, burnForUpload, isPending: isBurnPending, isConfirming: isBurnConfirming } = useToken();
  const { registerVideo, isPending: isRegisterPending, isConfirming: isRegisterConfirming, isConfirmed: isRegisterConfirmed, error: registerError } = useInteraction();

  const [title, setTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [autoCover, setAutoCover] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState(""); // "signing", "uploading", "registering", "done"
  const [activeTab, setActiveTab] = useState("burn");

  // Sync tab with permit count (client-side only, avoids hydration mismatch)
  useEffect(() => {
    if (burnPermitCount > 0) setActiveTab("upload");
  }, [burnPermitCount]);

  // Watch register transaction confirmation
  useEffect(() => {
    if (status === "registering" && isRegisterConfirming) {
      setUploadProgress(90);
      toast.info("Waiting for on-chain confirmation...");
    }
  }, [status, isRegisterConfirming]);

  useEffect(() => {
    if (status === "registering" && isRegisterConfirmed) {
      setUploadProgress(100);
      setStatus("done");
      toast.success("Video registered successfully!");
      setTimeout(() => router.push("/"), 2000);
    }
  }, [status, isRegisterConfirmed, router]);

  // Watch register transaction error
  useEffect(() => {
    if (status === "registering" && registerError) {
      toast.error(registerError.message || "On-chain registration failed");
      setStatus("");
      setUploadProgress(0);
    }
  }, [status, registerError]);

  const handleBurn = async () => {
    try {
      await burnForUpload();
      toast.success("Burn transaction submitted");
    } catch (error: any) {
      toast.error(error.message || "Burn failed");
    }
  };

  const handleUpload = async () => {
    if (!title || !videoFile) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!address) return;

    try {
      setStatus("signing");
      const timestamp = Math.floor(Date.now() / 1000);
      const message = `BSC-DApp-Auth:${timestamp}`;
      const signature = await signMessageAsync({ message });

      setStatus("uploading");
      setUploadProgress(10);

      // 1. Upload/Generate Cover
      let coverCid = "";
      if (autoCover) {
        toast.info("Uploading video and generating cover...");
        const coverRes = await api.generateCover(videoFile, address, signature, message);
        if (!coverRes.success) throw new Error("Cover generation failed");
        coverCid = coverRes.cid;
        setUploadProgress(40);
      } else if (coverFile) {
        toast.info("Uploading cover...");
        const coverRes = await api.uploadCover(coverFile, address, signature, message);
        if (!coverRes.success) throw new Error("Cover upload failed");
        coverCid = coverRes.cid;
        setUploadProgress(30);
      } else {
        throw new Error("No cover provided");
      }

      // 2. Upload Video
      toast.info("Uploading video...");
      const videoRes = await api.uploadVideo(videoFile, address, signature, message);
      if (!videoRes.success) throw new Error("Video upload failed");
      const videoCid = videoRes.cid;
      setUploadProgress(80);

      // 3. Register on-chain (confirmation tracked via useEffect above)
      setStatus("registering");
      toast.info("Registering on-chain...");
      registerVideo(videoCid, title, coverCid);
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Upload failed");
      setStatus("");
      setUploadProgress(0);
    }
  };

  if (!isConnected) {
    return (
      <div className="container flex items-center justify-center min-h-[60vh]">
        <Alert className="max-w-md">
          <AlertTitle>Wallet Not Connected</AlertTitle>
          <AlertDescription>Please connect your wallet to upload videos.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Upload Video</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="burn">
            1. Get Permit
          </TabsTrigger>
          <TabsTrigger value="upload">
            2. Upload Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="burn">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="text-orange-500" />
                Burn Tokens for Permit
              </CardTitle>
              <CardDescription>
                You need to burn tokens to get an upload permit.
                Current Balance: {balance.toLocaleString()} VIDE
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span>Burn Cost:</span>
                  <span className="font-bold">50,000 VIDE</span>
                </div>
                <div className="flex justify-between">
                  <span>Your Permits:</span>
                  <span className="font-bold">{burnPermitCount}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleBurn} 
                disabled={isBurnPending || isBurnConfirming || balance < 50000}
              >
                {isBurnPending || isBurnConfirming ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Flame className="mr-2 h-4 w-4" />
                )}
                {isBurnPending ? "Confirming..." : "Burn 50,000 VIDE"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Video Details</CardTitle>
              <CardDescription>
                Upload your video and set a title. ({burnPermitCount} permits remaining)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  placeholder="Enter video title" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video">Video File (MP4, max 100MB)</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    id="video" 
                    type="file" 
                    accept="video/mp4"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  <FileVideo className="text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Cover Image</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input 
                      type="checkbox" 
                      id="auto-cover" 
                      checked={autoCover}
                      onChange={(e) => setAutoCover(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="auto-cover">Auto-generate from video</label>
                  </div>
                </div>
                
                {!autoCover && (
                  <div className="flex items-center gap-4">
                    <Input 
                      id="cover" 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    <ImageIcon className="text-muted-foreground" />
                  </div>
                )}
              </div>

              {status && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{status}...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleUpload}
                disabled={!title || !videoFile || (!autoCover && !coverFile) || !!status}
              >
                {status ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UploadIcon className="mr-2 h-4 w-4" />
                )}
                Upload & Register
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
