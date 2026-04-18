import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Database, Settings } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Link } from 'react-router-dom';

const DEFAULT_REPOS = [
  {
    id: 'nisn',
    name: 'NISN (National Student ID)',
    description: 'Data NISN siswa nasional',
    url: 'https://nisn.data.kemdikbud.go.id/',
    installed: false,
  },
  {
    id: 'emis',
    name: 'EMIS (Education Management Information System)',
    description: 'Data EMIS sekolah/madrasah',
    url: 'https://emis.kemdikbud.go.id/',
    installed: false,
  },
  {
    id: 'pdum',
    name: 'PDUM (Custom Education Data)',
    description: 'Data pendidikan custom',
    url: '',
    installed: false,
  },
];

export default function Fitur() {
  const { data } = useApp();
  const repositories = data.settings.repositories || DEFAULT_REPOS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Fitur & Modul</h1>
        <p className="text-muted-foreground">Kelola repository tambahan seperti NISN, EMIS, PDUM. Install via Pengaturan </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repositories.map((repo) => (
          <Card key={repo.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5" />
                {repo.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{repo.description}</p>
              {repo.installed ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  Terpasang
                </div>
              ) : (
                <div className="text-sm text-amber-600">Belum terpasang</div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {repo.url && (
                  <Button variant="outline" asChild size="sm">
                    <a href={repo.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-4 w-4" />
                      Landing Page
                    </a>
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link to="/pengaturan?tab=fitur">
                    <Settings className="mr-1 h-4 w-4" />
                    Kelola
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Custom Repositories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Tambahkan repository custom via Pengaturan 
          </p>
          <Button variant="outline" asChild>
            <Link to="/pengaturan?tab=fitur">
              Tambah Repository
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
