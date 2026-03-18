// /src/routes/upload.js
const express = require('express');
const router = express.Router();
const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
const authMiddleware = require('../middlewares/auth'); // Ajuste o caminho se necessário

// Rota para gerar SAS token para upload
router.post('/sas-token', authMiddleware, async (req, res) => {
    try {
        // Verificar se é prestador (opcional, depende da sua lógica)
        if (req.usuario.tipo !== 'prestador') {
            return res.status(403).json({ error: 'Apenas prestadores podem fazer upload' });
        }

        const { filename } = req.body;
        const userId = req.usuario.id; // Pega o ID do usuário logado

        if (!filename) {
            return res.status(400).json({ error: 'filename é obrigatório' });
        }

        // Configurações do Azure
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            return res.status(500).json({ error: 'Configuração de storage não encontrada' });
        }

        const containerName = 'fotos-perfil';

        // Criar cliente do Azure
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Criar nome único para o arquivo
        const timestamp = Date.now();
        const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const blobName = `prestadores/${userId}/${timestamp}-${safeFilename}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        // Gerar SAS token válido por 10 minutos
        const sasOptions = {
            containerName,
            blobName,
            startsOn: new Date(),
            expiresOn: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
            permissions: BlobSASPermissions.parse("w") // Apenas escrita
        };

        const sasToken = generateBlobSASQueryParameters(sasOptions, blobServiceClient.credential).toString();
        const sasUrl = `${blockBlobClient.url}?${sasToken}`;

        res.json({
            sasUrl,
            blobName,
            mensagem: 'Token gerado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao gerar SAS token:', error);
        res.status(500).json({ error: error.message || 'Erro interno ao gerar token' });
    }
});

module.exports = router;
