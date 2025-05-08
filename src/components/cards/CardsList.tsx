import { useState, useEffect } from "react";
import { Card as CardType } from "@/types/card";
import { fetchCards, getCardsByAccount, deleteCard } from "@/services/cardService";
import { getAccountById } from "@/services/accountService";
import CardItem from "./CardItem";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CardDialog from "./CardDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CardsListProps {
  accountId?: string;
}

const CardsList = ({ accountId }: CardsListProps) => {
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const loadCards = async () => {
    try {
      setLoading(true);
      console.log("Loading cards...", accountId ? `for account ${accountId}` : "all cards");
      
      // If we're loading cards for a specific account, make sure to get the account details first
      if (accountId) {
        console.log(`Fetching account details for ${accountId}`);
        const account = await getAccountById(accountId);
        if (account) {
          console.log(`Found account ${account.name} with balance ${account.balance}`);
          const accountCards = await getCardsByAccount(accountId);
          console.log(`Loaded ${accountCards.length} cards for account ${accountId}`);
          
          // Make sure all cards have the account balance
          const cardsWithBalance = accountCards.map(card => ({
            ...card,
            current_balance: account.balance
          }));
          
          setCards(cardsWithBalance);
          return;
        } else {
          console.warn(`Account ${accountId} not found`);
        }
      }
      
      // Otherwise just fetch all cards
      const allCards = await fetchCards();
      console.log(`Loaded ${allCards.length} cards`);
      
      // Log the balances for debugging
      allCards.forEach(card => {
        console.log(`Card ${card.card_id}: ${card.name || card.card_name} - Balance: ${card.current_balance}`);
      });
      
      setCards(allCards);
    } catch (error) {
      console.error("Error loading cards:", error);
      toast({
        title: "Error",
        description: "Failed to load cards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [accountId]);

  const handleEditCard = (card: CardType) => {
    console.log("Editing card:", card);
    setSelectedCard(card);
    setIsDialogOpen(true);
  };

  const handleDeleteCard = (cardId: string) => {
    console.log("Delete requested for card:", cardId);
    // Set the card ID to delete and open the confirmation dialog
    setCardToDelete(cardId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;
    
    setIsDeleting(true);
    try {
      console.log(`Deleting card ${cardToDelete}`);
      await deleteCard(cardToDelete);
      toast({
        title: "Success",
        description: "Card deleted successfully",
      });
      // Refresh cards list after deletion
      loadCards();
    } catch (error) {
      console.error("Error deleting card:", error);
      toast({
        title: "Error",
        description: "Failed to delete card",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCardToDelete(null);
    }
  };

  const handleAddCard = () => {
    console.log("Adding new card", accountId ? `for account ${accountId}` : "");
    setSelectedCard(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (refresh: boolean = false) => {
    setIsDialogOpen(false);
    if (refresh) {
      console.log("Refreshing cards after dialog closed");
      loadCards();
    }
  };

  const handleRefresh = () => {
    console.log("Manual refresh requested");
    loadCards();
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Cards</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            className="flex items-center gap-2"
            title="Refresh cards data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleAddCard} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Card
          </Button>
        </div>
      </div>
      
      {cards.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <h3 className="text-lg font-medium mb-2">No cards found</h3>
          <p className="text-muted-foreground mb-4">Add your first card to get started</p>
          <Button onClick={handleAddCard} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Card
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          {cards.map((card) => (
            <CardItem
              key={card.card_id}
              card={card}
              onEdit={handleEditCard}
              onDelete={handleDeleteCard}
            />
          ))}
        </div>
      )}
      
      <CardDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        card={selectedCard}
        accountId={accountId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the card from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteCard} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CardsList;
