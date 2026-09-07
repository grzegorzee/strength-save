import java.io.*;
import java.security.*;
import java.util.*;
import java.util.jar.*;

class VerifyAabSignatures {
  public static void main(String[] args) throws Exception {
    String expected = "8f65cb13ad7b7dfe0871ddaacec3b3a4524b90a48ee0953c6c37ba9be37a9c65";
    int count = 0;
    try (JarFile jar = new JarFile(args[0], true)) {
      var entries = jar.entries();
      while (entries.hasMoreElements()) {
        JarEntry entry = entries.nextElement();
        if (entry.isDirectory()) continue;
        String name = entry.getName();
        if (name.equals("META-INF/MANIFEST.MF") || name.matches("META-INF/[^/]+\\.(SF|RSA|DSA|EC)")) continue;
        try (InputStream in = jar.getInputStream(entry)) { in.transferTo(OutputStream.nullOutputStream()); }
        CodeSigner[] signers = entry.getCodeSigners();
        if (signers == null || signers.length != 1) throw new SecurityException("Missing or unexpected signer: " + name);
        byte[] certificate = signers[0].getSignerCertPath().getCertificates().get(0).getEncoded();
        String actual = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(certificate));
        if (!expected.equals(actual)) throw new SecurityException("Certificate mismatch: " + name);
        count++;
      }
    }
    if (count == 0) throw new SecurityException("No signed payload entries");
    System.out.println("{\"JarFile_full_payload_signature_verification\":\"PASS\",\"signed_payload_entries\":" + count + ",\"all_match_existing_upload_certificate\":true}");
  }
}
