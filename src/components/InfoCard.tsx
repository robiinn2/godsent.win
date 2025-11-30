import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
}

const InfoCard = ({ title, children }: InfoCardProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg font-bold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {children}
      </CardContent>
    </Card>
  );
};

export default InfoCard;
