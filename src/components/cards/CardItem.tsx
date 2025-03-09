
import { formatNaira } from "@/utils/formatters";
import { Card as CardType } from "@/types/card";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CardItemProps {
  card: CardType;
  onEdit: (card: CardType) => void;
  onDelete: (cardId: string) => void;
}

const CardItem = ({ card, onEdit, onDelete }: CardItemProps) => {
  const getCardTypeColor = (type: string) => {
    switch (type) {
      case 'CREDIT':
        return 'bg-amber-100 text-amber-800';
      case 'DEBIT':
        return 'bg-cyan-100 text-cyan-800';
      case 'PREPAID':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format the expiry date (YYYY-MM-DD to MM/YY)
  const formatExpiryDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(2);
      return `${month}/${year}`;
    } catch {
      return '';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-5">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold">{card.card_name}</h3>
            {card.card_number && (
              <div className="mt-4 space-y-1">
                <p className="text-sm opacity-80">Card Number</p>
                <p className="font-mono tracking-wider">
                  ••••{' '}•••• {' '}•••• {' '}
                  {card.card_number.slice(-4)}
                </p>
              </div>
            )}
          </div>
          <Badge className={`${getCardTypeColor(card.card_type)}`}>
            {card.card_type}
          </Badge>
        </div>
        
        <div className="flex justify-between mt-4">
          {card.expiry_date && (
            <div>
              <p className="text-xs opacity-80">Expiry Date</p>
              <p className="font-mono">{formatExpiryDate(card.expiry_date)}</p>
            </div>
          )}
          <CreditCard className="h-8 w-8 opacity-60" />
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div>
          <p className="text-sm text-muted-foreground">Current Balance</p>
          <p className="text-2xl font-bold">{formatNaira(card.current_balance)}</p>
        </div>
        
        {card.credit_limit && (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">Credit Limit</p>
            <p className="text-lg">{formatNaira(card.credit_limit)}</p>
          </div>
        )}
        
        {card.custom_tags && card.custom_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {card.custom_tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex justify-end gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onEdit(card)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onDelete(card.card_id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CardItem;
