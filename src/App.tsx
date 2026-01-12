import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Templates from "./pages/Templates";
import UploadContacts from "./pages/UploadContacts";
import Drafts from "./pages/Drafts";
import SentEmails from "./pages/SentEmails";
import SenderAccounts from "./pages/SenderAccounts";
import Settings from "./pages/Settings";
import ContactLists from "./pages/ContactLists";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import OutlookView from "./pages/OutlookView";
import EmailSignatures from "./pages/EmailSignatures";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/upload" element={<UploadContacts />} />
          <Route path="/lists" element={<ContactLists />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/sent" element={<SentEmails />} />
          <Route path="/outlook" element={<OutlookView />} />
          <Route path="/signatures" element={<EmailSignatures />} />
          <Route path="/accounts" element={<SenderAccounts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
