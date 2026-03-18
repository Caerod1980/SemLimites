// /src/routes/upload.js
import express from 'express';
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';
import authMiddleware from '../middlewares/auth.js';

const router = express.Router();

// ========== ROTA PARA GERAR SAS TOKEN PARA UPLOAD (ESCRITA) ==========
router.post('/sas-token', authMiddleware, async (req, res) => {
    try {
        console.log('📸 Requisição de SAS token (upload) recebida');
        console.log('👤 Usuário autenticado:', req.usuario.email, 'Tipo:', req.usuario.tipo);
        
        // Verificar se é prestador
        if (req.usuario.tipo !== 'prestador') {
            return res.status(403).json({ error: 'Apenas prestadores podem fazer upload de fotos' });
        }

        const { filename } = req.body;
        const userId = req.usuario.id; // ID do usuário logado

        if (!filename) {
            return res.status(400).json({ error: 'filename é obrigatório' });
        }

        // Validar extensão do arquivo
        const extensao = filename.split('.').pop().toLowerCase();
        const extensoesPermitidas = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        if (!extensoesPermitidas.includes(extensao)) {
            return res.status(400).json({ 
                error: 'Tipo de arquivo não permitido. Use: JPG, JPEG, PNG, GIF, WEBP' 
            });
        }

        // Configurações do Azure
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            console.error('❌ AZURE_STORAGE_CONNECTION_STRING não configurada');
            return res.status(500).json({ error: 'Configuração de storage não encontrada' });
        }

        const containerName = 'fotos-perfil';

        // Criar cliente do Azure
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Garantir que o container existe
        await containerClient.createIfNotExists();

        // Criar nome único para o arquivo
        const timestamp = Date.now();
        const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const blobName = `prestadores/${userId}/${timestamp}-${safeFilename}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        // Gerar SAS token válido por 10 minutos (apenas para escrita)
        const sasOptions = {
            containerName,
            blobName,
            startsOn: new Date(),
            expiresOn: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
            permissions: BlobSASPermissions.parse("w") // Apenas escrita
        };

        const sasToken = generateBlobSASQueryParameters(sasOptions, blobServiceClient.credential).toString();
        const sasUrl = `${blockBlobClient.url}?${sasToken}`;

        console.log(`✅ SAS token de UPLOAD gerado para: ${blobName}`);

        res.json({
            sasUrl,
            blobName,
            mensagem: 'Token de upload gerado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao gerar SAS token de upload:', error);
        res.status(500).json({ error: error.message || 'Erro interno ao gerar token' });
    }
});

// ========== NOVA ROTA: GERAR SAS TOKEN PARA LEITURA ==========
// Esta rota NÃO requer autenticação porque é usada para exibir imagens publicamente
router.post('/sas-token-leitura', async (req, res) => {
    try {
        console.log('📸 Requisição de SAS token (leitura) recebida');
        
        const { blobUrl } = req.body;
        
        if (!blobUrl) {
            return res.status(400).json({ error: 'blobUrl é obrigatório' });
        }

        console.log('🔍 URL recebida:', blobUrl);

        // Extrair o nome do blob da URL
        // URL exemplo: https://semlimitesfotos.blob.core.windows.net/fotos-perfil/prestadores/123/abc.jpg
        try {
            const urlObj = new URL(blobUrl);
            
            // Verificar se é do Azure Blob Storage
            if (!urlObj.hostname.includes('blob.core.windows.net')) {
                return res.status(400).json({ error: 'URL não é do Azure Blob Storage' });
            }
            
            const pathParts = urlObj.pathname.split('/');
            
            // pathParts = ['', 'fotos-perfil', 'prestadores', '123', 'abc.jpg']
            // O primeiro elemento é vazio porque a string começa com '/'
            if (pathParts.length < 3) {
                return res.status(400).json({ error: 'URL de blob inválida' });
            }
            
            const containerName = pathParts[1]; // 'fotos-perfil'
            const blobName = pathParts.slice(2).join('/'); // 'prestadores/123/abc.jpg'

            console.log('📦 Container:', containerName);
            console.log('📦 Blob name:', blobName);

            // Configurações do Azure
            const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!connectionString) {
                console.error('❌ AZURE_STORAGE_CONNECTION_STRING não configurada');
                return res.status(500).json({ error: 'Configuração de storage não encontrada' });
            }

            const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            // Gerar SAS token válido por 60 minutos para LEITURA
            const sasOptions = {
                containerName,
                blobName,
                startsOn: new Date(),
                expiresOn: new Date(Date.now() + 60 * 60 * 1000), // 60 minutos
                permissions: BlobSASPermissions.parse("r") // Apenas leitura
            };

            const sasToken = generateBlobSASQueryParameters(sasOptions, blobServiceClient.credential).toString();
            const sasUrl = `${blockBlobClient.url}?${sasToken}`;

            console.log(`✅ SAS token de LEITURA gerado para: ${blobName}`);
            console.log(`⏰ Expira em: ${new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString()}`);

            res.json({
                sasUrl,
                mensagem: 'Token de leitura gerado com sucesso'
            });

        } catch (urlError) {
            console.error('❌ Erro ao processar URL:', urlError);
            return res.status(400).json({ error: 'URL inválida' });
        }

    } catch (error) {
        console.error('❌ Erro ao gerar SAS token de leitura:', error);
        res.status(500).json({ error: error.message || 'Erro interno ao gerar token de leitura' });
    }
});

export default router;
