"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Pessoa {
  Nome: string;
  UMP: string;
  Código: string;
  _norm?: string; // cache do nome normalizado para busca
}

// ✅ Normaliza para busca: ignora acentos, cedilha e símbolos
function normalize(str?: string | null) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // remove acentos/cedilhas
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]/g, " ") // remove símbolos
    .replace(/\s+/g, " ")
    .trim();
}

// 🔧 Corrige strings quebradas tipo "CatolÃ©" → "Catolé"
function fixEncoding(str?: string | null) {
  if (!str) return "";
  try {
    // decodeURIComponent(escape()) corrige Latin1→UTF8 em strings já corrompidas
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
}

export default function App() {
  const [data, setData] = useState<Pessoa[]>([]);
  const [nome, setNome] = useState("");
  const [matches, setMatches] = useState<Pessoa[]>([]);
  const [selected, setSelected] = useState<Pessoa | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch("/dados_exportados.csv")
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        // 1) Corrige encoding ISO-8859-1 → UTF-8
        const decoder = new TextDecoder("iso-8859-1");
        const csv = decoder.decode(buffer);

        // 2) Parse CSV e ajusta cabeçalhos possivelmente corrompidos
        const parsed = Papa.parse<Pessoa>(csv, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) =>
            header
              .replace("CÃ³digo", "Código")
              .replace("Nome", "Nome")
              .replace("UMP", "UMP"),
        }).data;

        // 3) Corrige conteúdo e cria campo normalizado
        const fixed: Pessoa[] = parsed
          .map((row) => {
            const Nome = fixEncoding(row.Nome);
            const UMP = fixEncoding(row.UMP);
            const Código = fixEncoding(row.Código);
            return { Nome, UMP, Código, _norm: normalize(Nome) };
          })
          .filter((r) => r.Nome && r.Código); // remove linhas vazias

        console.log(fixed);
        setData(fixed);
      });
  }, []);

  const handleSearch = () => {
    const term = normalize(nome.trim());
    setSearched(true);
    setSelected(null);
    if (!term) {
      setMatches([]);
      return;
    }
    const found = data.filter((item) => item._norm?.includes(term));
    setMatches(found);
  };

  const handleSelect = (pessoa: Pessoa) => setSelected(pessoa);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-xl font-semibold">
            Buscar seu código
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Digite seu nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <Button className="w-full" onClick={handleSearch}>
            Buscar
          </Button>

          {/* Só mostra mensagem após clique */}
          {searched && matches.length === 0 && nome.trim() && (
            <p className="text-center text-red-500 text-sm">
              Nome não encontrado. Verifique se digitou corretamente.
            </p>
          )}

          {matches.length === 1 && !selected && (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">Encontrado:</p>
              <Button
                className="w-full"
                onClick={() => handleSelect(matches[0])}
              >
                {matches[0].Nome}
              </Button>
            </div>
          )}

          {matches.length > 1 && !selected && (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Há mais de uma pessoa com esse nome. Escolha seu nome completo:
              </p>
              <div className="space-y-2">
                {matches.map((pessoa) => (
                  <Button
                    key={pessoa.Código}
                    className="w-full text-neutral-50"
                    variant="secondary"
                    onClick={() => handleSelect(pessoa)}
                  >
                    {pessoa.Nome}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {selected && (
            <div className="text-center space-y-2">
              <p className="text-sm text-neutral-600 font-semibold">
                {selected.Nome} - Seu link de votação:
              </p>
              <a
                href={`https://sisvoto.ump.app.br/App?codigo=${selected.Código}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full">Acessar meu link</Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
