// pages/api/project-files/[slug].ts

import { NextApiRequest, NextApiResponse } from 'next';
import JSZip from 'jszip';
import path from 'path';
import fs from 'fs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;
  
  // Security check
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid project slug' });
  }
  
  try {
    // Get project files from your storage system
    const projectFilesPath = path.join(process.cwd(), 'public', 'project-files', `${slug}.zip`);
    
    if (!fs.existsSync(projectFilesPath)) {
      return res.status(404).json({ error: 'Project files not found' });
    }
    
    // Set appropriate headers for ZIP file
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.zip"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(projectFilesPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error serving project files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}