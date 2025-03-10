
import { useState, useEffect } from "react";
import { Card as CardType } from "@/types/card";
import { fetchCards, getCardsByAccount } from "@/services/cardService";
import CardItem from "./CardItem";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CardDialog from "./CardDialog";

interface CardsListProps {
  accountId?: string;
}

const CardsList = ({ accountId }: CardsListProps) => {
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const { toast } = useToast();

  const loadCards = async () => {
    try {
      setLoading(true);
      const data = accountId 
        ? await getCardsByAccount(accountId)
        : await fetchCards();
      setCards(data);
    } catch (error) {
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
    setSelectedCard(card);
    setIsDialogOpen(true);
  };

  const handleDeleteCard = (cardId: string) => {
    // Will be implemented in CardDialog.tsx
  };

  const handleAddCard = () => {
    setSelectedCard(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (refresh: boolean = false) => {
    setIsDialogOpen(false);
    if (refresh) {
      loadCards();
    }
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
        <Button onClick={handleAddCard} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Card
        </Button>
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
    </div>
  );
};

export default CardsList;
