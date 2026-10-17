import { useState } from "react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Trabalha com a data em "yyyy-MM-dd" (mesmo formato do <input type="date">),
// assim quem usa pode mandar o valor direto pra API sem converter.
function DataPicker({ value, onChange, placeholder = "Selecione uma data", id, className = "" }) {
    const [aberto, setAberto] = useState(false);
    const data = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;

    const selecionar = (novaData) => {
        onChange(novaData ? format(novaData, "yyyy-MM-dd") : "");
        setAberto(false);
    };

    return (
        <Popover open={aberto} onOpenChange={setAberto}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    className={`w-full justify-start px-3 font-normal ${data ? "" : "text-muted-foreground"} ${className}`}
                >
                    <CalendarIcon />
                    {data ? format(data, "dd/MM/yyyy") : placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    locale={ptBR}
                    selected={data}
                    defaultMonth={data}
                    onSelect={selecionar}
                    disabled={{ after: new Date() }}
                />
            </PopoverContent>
        </Popover>
    );
}

export default DataPicker;
